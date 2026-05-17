import { z } from "zod";
import { MossClient as SdkClient } from "@inferedge/moss";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { MossClient } from "./index";

/**
 * Live Moss client. The SDK is a thin wrapper around Moss cloud; we keep
 * our internal interface stable so the orchestrator never sees vendor types.
 *
 * Caching strategy: a single module-level `Promise<SdkClient>` so the first
 * caller pays init cost (loadIndex / createIndex for both indexes) and every
 * concurrent caller awaits the same in-flight promise. On failure we clear
 * the cache so a retry actually re-runs init.
 */

let _clientPromise: Promise<SdkClient> | null = null;

function buildClient(): SdkClient {
  const projectId = env.MOSS_PROJECT_ID;
  const projectKey = env.MOSS_PROJECT_KEY;
  if (!projectId || !projectKey) {
    throw new IntegrationError(
      "moss",
      "MOSS_PROJECT_KEY or MOSS_PROJECT_ID missing — cannot use live moss. " +
        "Set both in .env.local or switch MOSS_MODE=mock.",
    );
  }
  return new SdkClient(projectId, projectKey);
}

/**
 * Ensure an index exists on the server and is loaded for fast queries.
 * Tries loadIndex first; if that throws we attempt createIndex with an empty
 * seed; if creation throws because the index already exists we swallow that
 * and fall back to one more loadIndex. Any other error is wrapped.
 */
async function ensureIndex(client: SdkClient, indexName: string): Promise<void> {
  try {
    await client.loadIndex(indexName);
    return;
  } catch (loadErr) {
    // Index probably doesn't exist yet — try creating it empty.
    try {
      await client.createIndex(indexName, []);
    } catch (createErr) {
      // If creation failed because the index already exists, ignore.
      const msg = (createErr as Error)?.message ?? String(createErr);
      if (!/exist/i.test(msg)) {
        throw new IntegrationError(
          "moss",
          `failed to create index "${indexName}": ${msg}`,
          createErr,
        );
      }
    }
    // After (attempted) creation, try loading once more so queries run fast.
    try {
      await client.loadIndex(indexName);
    } catch (reloadErr) {
      throw new IntegrationError(
        "moss",
        `failed to load index "${indexName}" after create attempt: ${
          (reloadErr as Error)?.message ?? String(reloadErr)
        } (original load error: ${(loadErr as Error)?.message ?? String(loadErr)})`,
        reloadErr,
      );
    }
  }
}

async function getClient(): Promise<SdkClient> {
  if (_clientPromise) return _clientPromise;
  _clientPromise = (async () => {
    const client = buildClient();
    await ensureIndex(client, env.MOSS_CONTRACTORS_INDEX);
    await ensureIndex(client, env.MOSS_KNOWLEDGE_INDEX);
    return client;
  })().catch((err) => {
    // Clear cache so the next caller can retry init.
    _clientPromise = null;
    if (err instanceof IntegrationError) throw err;
    throw new IntegrationError(
      "moss",
      `init failed: ${(err as Error)?.message ?? String(err)}`,
      err,
    );
  });
  return _clientPromise;
}

/**
 * The SDK constrains metadata to Record<string, string>. We stringify any
 * non-string values so we can round-trip richer payloads (arrays, numbers).
 */
function stringifyMetadata(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}

const SearchDocsSchema = z.array(
  z.object({
    id: z.string(),
    text: z.string().optional(),
    score: z.number(),
  }),
);

async function safeQuery(
  client: SdkClient,
  indexName: string,
  text: string,
  topK: number,
) {
  const started = Date.now();
  let result;
  try {
    result = await client.query(indexName, text, { topK });
  } catch (err) {
    throw new IntegrationError(
      "moss",
      `query on "${indexName}" failed: ${(err as Error)?.message ?? String(err)}`,
      err,
    );
  }
  const elapsed = Date.now() - started;
  if (elapsed > 50) {
    console.warn(`[moss] slow query on "${indexName}": ${elapsed}ms (topK=${topK})`);
  }
  const parsed = SearchDocsSchema.safeParse(result?.docs);
  if (!parsed.success) {
    throw new IntegrationError(
      "moss",
      `search response shape mismatch: ${parsed.error.message}`,
      parsed.error,
    );
  }
  return parsed.data;
}

export const moss: MossClient = {
  async init() {
    await getClient();
  },

  async indexContractor(record) {
    const client = await getClient();
    const text = `${record.trades.join(" ")} ${record.city} ${record.name} ${record.specialties.join(" ")}`;
    try {
      await client.addDocs(
        env.MOSS_CONTRACTORS_INDEX,
        [
          {
            id: record.contractorId,
            text,
            metadata: stringifyMetadata({
              contractorId: record.contractorId,
              name: record.name,
              trades: record.trades,
              city: record.city,
              specialties: record.specialties,
              rating: record.rating,
            }),
          },
        ],
        { upsert: true },
      );
    } catch (err) {
      throw new IntegrationError(
        "moss",
        `indexContractor failed for "${record.contractorId}": ${
          (err as Error)?.message ?? String(err)
        }`,
        err,
      );
    }
  },

  async indexKnowledge(record) {
    const client = await getClient();
    try {
      await client.addDocs(
        env.MOSS_KNOWLEDGE_INDEX,
        [
          {
            id: record.id,
            text: record.text,
            metadata: stringifyMetadata({ tags: record.tags }),
          },
        ],
        { upsert: true },
      );
    } catch (err) {
      throw new IntegrationError(
        "moss",
        `indexKnowledge failed for "${record.id}": ${
          (err as Error)?.message ?? String(err)
        }`,
        err,
      );
    }
  },

  async searchContractors({ trade, city, problem, topK }) {
    const client = await getClient();
    const limit = Math.max(1, topK ?? 5);
    const docs = await safeQuery(
      client,
      env.MOSS_CONTRACTORS_INDEX,
      `${trade} ${city} ${problem}`,
      limit,
    );
    return {
      hits: docs.map((d) => ({ contractorId: d.id, score: d.score })),
    };
  },

  async searchKnowledge({ query, topK }) {
    const client = await getClient();
    const limit = Math.max(1, topK ?? 3);
    const docs = await safeQuery(client, env.MOSS_KNOWLEDGE_INDEX, query, limit);
    return {
      hits: docs.map((d) => ({ id: d.id, text: d.text ?? "", score: d.score })),
    };
  },
};
