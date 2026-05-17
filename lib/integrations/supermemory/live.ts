import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { SupermemoryClient } from "./index";

const BASE = "https://api.supermemory.ai";

function headers(): Record<string, string> {
  const key = env.SUPERMEMORY_API_KEY;
  if (!key) {
    throw new IntegrationError(
      "supermemory",
      "SUPERMEMORY_API_KEY missing — set it or switch SUPERMEMORY_MODE=mock.",
      null,
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

const AddResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

const SearchResponseSchema = z.object({
  results: z.array(
    z.object({
      documentId: z.string(),
      score: z.number(),
      metadata: z.record(z.string(), z.unknown()).default({}),
      chunks: z.array(z.object({ content: z.string() })).default([]),
      title: z.string().optional(),
    }),
  ),
});

export const supermemory: SupermemoryClient = {
  async remember(input) {
    const res = await fetch(`${BASE}/v3/documents`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        content: input.text,
        metadata: input.metadata ?? {},
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new IntegrationError("supermemory", `remember failed: ${res.status} ${detail}`, null);
    }

    const parsed = AddResponseSchema.parse(await res.json());
    return { id: parsed.id };
  },

  async recall(input) {
    const res = await fetch(`${BASE}/v3/search`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        q: input.query,
        limit: input.topK ?? 3,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new IntegrationError("supermemory", `recall failed: ${res.status} ${detail}`, null);
    }

    const parsed = SearchResponseSchema.parse(await res.json());
    return {
      memories: parsed.results.map((r) => ({
        id: r.documentId,
        text: r.chunks[0]?.content ?? r.title ?? "",
        score: r.score,
        metadata: r.metadata,
      })),
    };
  },
};
