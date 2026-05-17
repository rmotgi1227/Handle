import type { SupermemoryClient } from "./index";

/**
 * In-process Supermemory mock. Recall returns the 3 most recent items whose
 * text or tags contain any whole-word token from the query, ordered newest
 * first. Score = (token overlap) / (query token count) — deterministic.
 */

interface MemoryRow {
  id: string;
  text: string;
  tags: string[];
  metadata: Record<string, unknown>;
  insertedAt: number;
}

let seq = 0;
const rows: MemoryRow[] = [];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 1);
}

export const supermemory: SupermemoryClient = {
  async recall({ query, topK }) {
    const limit = Math.max(1, topK ?? 3);
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return { memories: [] };
    const scored = rows
      .map((row) => {
        const haystack = tokenize(`${row.text} ${row.tags.join(" ")}`);
        const overlap = queryTokens.filter((t) => haystack.includes(t)).length;
        const score = overlap / queryTokens.length;
        return { row, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.row.insertedAt - a.row.insertedAt;
      })
      .slice(0, limit);
    return {
      memories: scored.map(({ row, score }) => ({
        id: row.id,
        text: row.text,
        score,
      })),
    };
  },

  async remember({ text, tags, metadata }) {
    seq += 1;
    const id = `mem_${seq.toString(36).padStart(6, "0")}`;
    rows.push({
      id,
      text,
      tags: tags ?? [],
      metadata: metadata ?? {},
      insertedAt: seq, // monotonic, deterministic
    });
    return { id };
  },
};
