import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env, requireEnv } from "@/lib/env";
import type { SupermemoryClient } from "./index";

const BASE = "https://api.supermemory.ai";

function headers(): HeadersInit {
  const key = requireEnv("SUPERMEMORY_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new IntegrationError("supermemory", `${path} → HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

const SearchResultSchema = z.object({
  results: z.array(
    z.object({
      documentId: z.string(),
      score: z.number(),
      chunks: z.array(z.object({ content: z.string() })),
    }),
  ),
});

const RememberResultSchema = z.object({
  id: z.string(),
  status: z.string(),
});

export const supermemory: SupermemoryClient = {
  async recall({ query, topK }) {
    try {
      const raw = await apiFetch("/v3/search", {
        method: "POST",
        body: JSON.stringify({ q: query, limit: topK ?? 3 }),
      });
      const parsed = SearchResultSchema.safeParse(raw);
      if (!parsed.success) {
        throw new IntegrationError("supermemory", `recall: unexpected response shape: ${parsed.error.message}`);
      }
      return {
        memories: parsed.data.results.map((r) => ({
          id: r.documentId,
          text: r.chunks[0]?.content ?? "",
          score: r.score,
        })),
      };
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError("supermemory", "recall failed", err);
    }
  },

  async remember({ text }) {
    try {
      const raw = await apiFetch("/v3/memories", {
        method: "POST",
        body: JSON.stringify({ content: text }),
      });
      const parsed = RememberResultSchema.safeParse(raw);
      if (!parsed.success) {
        throw new IntegrationError("supermemory", `remember: unexpected response shape: ${parsed.error.message}`);
      }
      return { id: parsed.data.id };
    } catch (err) {
      if (err instanceof IntegrationError) throw err;
      throw new IntegrationError("supermemory", "remember failed", err);
    }
  },
};
