import { z } from "zod";
import { MossClient as SdkClient, type DocumentInfo } from "@inferedge/moss";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { MossClient } from "./index";

/**
 * Live Moss client. The SDK is a thin wrapper around Moss cloud; we keep
 * our internal interface stable so the orchestrator never sees vendor types.
 *
 * Bootstrap strategy: Moss `createIndex` requires at least one document, and
 * `addDocs` requires the index to already exist. To avoid a chicken-and-egg
 * deadlock on a fresh project, we lazily bootstrap each index on the first
 * write: if the index is unknown, we attempt `loadIndex`; on success the
 * index exists and we use `addDocs`. On failure we treat the index as
 * not-yet-existing and call `createIndex(name, [doc])` to create+seed in
 * one shot. Subsequent writes use `addDocs`.
 *
 * For reads, if `loadIndex` fails we surface an empty result rather than an
 * error — semantically the index has no documents.
 *
 * Caching strategy: a single module-level `Promise<SdkClient>` for client
 * construction; a per-index `Map<name, "ready" | Promise<"ready">>` for
 * bootstrap so concurrent writes don't race.
 */

let _clientPromise: Promise<SdkClient> | null = null;

/**
 * Index bootstrap state. `"ready"` means we've successfully written or
 * loaded; a pending `Promise` means a bootstrap is in flight. Absence
 * means the index has not been touched yet.
 */
const _indexState = new Map<string, "ready" | Promise<void>>();

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

async function getClient(): Promise<SdkClient> {
  if (_clientPromise) return _clientPromise;
  _clientPromise = Promise.resolve().then(buildClient).catch((err) => {
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
 * Try to load the index. Returns true if it exists, false otherwise.
 * Any other error is propagated.
 */
async function indexExists(client: SdkClient, indexName: string): Promise<boolean> {
  try {
    await client.loadIndex(indexName);
    return true;
  } catch {
    // The SDK throws if the index doesn't exist OR on a transient failure.
    // We can't reliably distinguish, so callers must be tolerant: writes
    // will fall through to createIndex (which will throw "already exists"
    // if it was actually a transient load failure — we catch that below).
    return false;
  }
}

/**
 * Ensure the index exists, seeding it with the provided document if we
 * need to call createIndex. Idempotent across concurrent callers.
 */
async function ensureIndexWithSeed(
  client: SdkClient,
  indexName: string,
  seedDoc: DocumentInfo,
): Promise<void> {
  const cached = _indexState.get(indexName);
  if (cached === "ready") return;
  if (cached) return cached;

  const pending = (async () => {
    if (await indexExists(client, indexName)) {
      _indexState.set(indexName, "ready");
      return;
    }
    try {
      await client.createIndex(indexName, [seedDoc]);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      // If another caller (or a prior session) already created it, that's fine.
      if (!/exist/i.test(msg)) {
        _indexState.delete(indexName);
        throw new IntegrationError(
          "moss",
          `failed to create index "${indexName}": ${msg}`,
          err,
        );
      }
      // Index already exists — we still need to add our seedDoc via addDocs.
      try {
        await client.addDocs(indexName, [seedDoc], { upsert: true });
      } catch (addErr) {
        _indexState.delete(indexName);
        throw new IntegrationError(
          "moss",
          `addDocs after createIndex-already-exists on "${indexName}" failed: ${
            (addErr as Error)?.message ?? String(addErr)
          }`,
          addErr,
        );
      }
    }
    _indexState.set(indexName, "ready");
  })();

  _indexState.set(indexName, pending);
  return pending;
}

async function writeDoc(
  client: SdkClient,
  indexName: string,
  doc: DocumentInfo,
): Promise<void> {
  // Bootstrap (or wait for in-flight bootstrap) using this doc as the seed
  // if the index doesn't exist yet.
  await ensureIndexWithSeed(client, indexName, doc);
  // After bootstrap, addDocs is safe. If the bootstrap path used this exact
  // doc as the seed, addDocs with upsert is a no-op (same id).
  try {
    await client.addDocs(indexName, [doc], { upsert: true });
  } catch (err) {
    throw new IntegrationError(
      "moss",
      `addDocs on "${indexName}" failed for id "${doc.id}": ${
        (err as Error)?.message ?? String(err)
      }`,
      err,
    );
  }
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
  // If the index has never been written to, loadIndex will fail. Treat that
  // as "no hits" rather than an error so the orchestrator can degrade.
  if (_indexState.get(indexName) !== "ready") {
    try {
      await client.loadIndex(indexName);
      _indexState.set(indexName, "ready");
    } catch {
      return [];
    }
  }
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
    // No-op: indexes are bootstrapped lazily on first write so we never
    // hit the empty-createIndex constraint.
    await getClient();
  },

  async indexContractor(record) {
    const client = await getClient();
    const text = `${record.trades.join(" ")} ${record.city} ${record.name} ${record.specialties.join(" ")}`;
    try {
      await writeDoc(client, env.MOSS_CONTRACTORS_INDEX, {
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
      });
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
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
      await writeDoc(client, env.MOSS_KNOWLEDGE_INDEX, {
        id: record.id,
        text: record.text,
        metadata: stringifyMetadata({ tags: record.tags }),
      });
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
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
