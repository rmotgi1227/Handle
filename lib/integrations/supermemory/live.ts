import { z } from "zod";
import { env } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/adapter";
import type { SupermemoryClient } from "./index";

/**
 * Live Supermemory client.
 *
 * Endpoints (verified 2026-05-17 against api.supermemory.ai):
 *   - POST /v3/search     body { q, limit? }   → { results: [...], total, timing }
 *   - POST /v3/documents  body { content, containerTags?, metadata? } → { id, status }
 *
 * Auth: Authorization: Bearer ${SUPERMEMORY_API_KEY}
 * Optional: x-project-id: ${SUPERMEMORY_PROJECT_ID}
 */

const BASE_URL = "https://api.supermemory.ai";

const SearchChunkSchema = z.object({
  content: z.string(),
  position: z.number().optional(),
  isRelevant: z.boolean().optional(),
  score: z.number().optional(),
});

const SearchResultSchema = z.object({
  documentId: z.string(),
  score: z.number(),
  chunks: z.array(SearchChunkSchema).optional().default([]),
  title: z.string().optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
});

const DocumentResponseSchema = z.object({
  id: z.string(),
});

function requireKeys(method: string): { apiKey: string; projectId: string | undefined } {
  if (!env.SUPERMEMORY_API_KEY) {
    throw new IntegrationError(
      "supermemory",
      `SUPERMEMORY_API_KEY missing — cannot call ${method} in live mode. ` +
        `Set SUPERMEMORY_API_KEY (and optionally SUPERMEMORY_PROJECT_ID) or switch INTEGRATION_MODE=mock.`,
    );
  }
  return { apiKey: env.SUPERMEMORY_API_KEY, projectId: env.SUPERMEMORY_PROJECT_ID };
}

function authHeaders(apiKey: string, projectId: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (projectId) headers["x-project-id"] = projectId;
  return headers;
}

function chunksToText(chunks: { content: string }[], fallbackTitle: string): string {
  if (chunks.length === 0) return fallbackTitle;
  return chunks.map((c) => c.content).join("\n");
}

export const supermemory: SupermemoryClient = {
  async recall({ query, topK }) {
    const { apiKey, projectId } = requireKeys("recall");
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/v3/search`, {
        method: "POST",
        headers: authHeaders(apiKey, projectId),
        body: JSON.stringify({ q: query, limit: topK ?? 3 }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new IntegrationError("supermemory", "recall network error", cause);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      throw new IntegrationError(
        "supermemory",
        `recall returned ${res.status}: ${body.slice(0, 200)}`,
      );
    }
    const json: unknown = await res.json();
    const parsed = SearchResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntegrationError(
        "supermemory",
        `recall response shape mismatch: ${parsed.error.message}`,
      );
    }
    return {
      memories: parsed.data.results.map((r) => ({
        id: r.documentId,
        text: chunksToText(r.chunks, r.title),
        score: r.score,
        metadata: r.metadata,
      })),
    };
  },

  async remember({ text, tags, metadata }) {
    const { apiKey, projectId } = requireKeys("remember");
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/v3/documents`, {
        method: "POST",
        headers: authHeaders(apiKey, projectId),
        body: JSON.stringify({
          content: text,
          ...(tags ? { containerTags: tags } : {}),
          ...(metadata ? { metadata } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (cause) {
      throw new IntegrationError("supermemory", "remember network error", cause);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "<no body>");
      throw new IntegrationError(
        "supermemory",
        `remember returned ${res.status}: ${body.slice(0, 200)}`,
      );
    }
    const json: unknown = await res.json();
    const parsed = DocumentResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntegrationError(
        "supermemory",
        `remember response shape mismatch: ${parsed.error.message}`,
      );
    }
    return { id: parsed.data.id };
  },
};
