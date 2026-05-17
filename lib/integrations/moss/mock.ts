import type {
  MossClient,
  MossContractorRecord,
  MossKnowledgeRecord,
} from "./index";

/**
 * In-process Moss mock. Token-overlap scoring keeps results deterministic
 * and demo-safe even if MOSS_PROJECT_KEY is absent.
 */

const contractors = new Map<string, MossContractorRecord>();
const knowledge = new Map<string, MossKnowledgeRecord>();

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 1);
}

function scoreOverlap(queryTokens: string[], haystackTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const set = new Set(haystackTokens);
  const overlap = queryTokens.filter((t) => set.has(t)).length;
  return overlap / queryTokens.length;
}

export const moss: MossClient = {
  async init() {
    // No-op; data lives in module-level Maps.
  },

  async indexContractor(record) {
    contractors.set(record.contractorId, record);
  },

  async indexKnowledge(record) {
    knowledge.set(record.id, record);
  },

  async searchContractors({ trade, city, problem, topK }) {
    const limit = Math.max(1, topK ?? 5);
    const q = tokenize(`${trade} ${city} ${problem}`);
    const scored = Array.from(contractors.values())
      .map((c) => {
        const tradeMatch = c.trades.includes(trade) ? 1 : 0;
        const cityMatch = c.city.toLowerCase() === city.toLowerCase() ? 0.3 : 0;
        const text = tokenize(`${c.name} ${c.specialties.join(" ")}`);
        const lexScore = scoreOverlap(q, text);
        const score = tradeMatch + cityMatch + lexScore;
        return { contractorId: c.contractorId, score };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { hits: scored };
  },

  async searchKnowledge({ query, topK }) {
    const limit = Math.max(1, topK ?? 3);
    const q = tokenize(query);
    const scored = Array.from(knowledge.values())
      .map((k) => {
        const text = tokenize(`${k.text} ${k.tags.join(" ")}`);
        return { id: k.id, text: k.text, score: scoreOverlap(q, text) };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { hits: scored };
  },
};
