# Supermemory + Moss Retrieval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire two-tier live retrieval into the orchestrator — Moss for sub-10ms contractor + knowledge catalog lookup, Supermemory for cross-session history — both seeded on boot for demo visibility.

**Architecture:** New `lib/integrations/moss/` adapter (index/mock/live) following the existing sponsor pattern. Existing Supermemory `live.ts` stub replaced with real Zod-validated HTTP. A new `lib/store/seed-retrieval.ts` runs at app boot to populate both stores. Orchestrator `runAgent()` step 5 builds a `RecallContext` from parallel queries and emits a new `context_recalled` JobEvent. Step 6 (`findContractorsForJob`) consumes Moss hits first and only falls back to Browser Use when fewer than 3 hits are returned.

**Tech Stack:** Next.js 16 / React 19, TypeScript strict, Zod 4 at boundaries, Vitest 4 for tests, `@inferedge/moss` SDK (new), existing `lib/integrations/adapter.ts` pattern.

**Spec:** `docs/superpowers/specs/2026-05-17-supermemory-moss-retrieval-design.md`

**Conventions reminder (from `TEAM.md`):**
- Server components by default; `"use client"` only when needed.
- Zod at every external boundary.
- No `any` — use `unknown` + type guards.
- Monochrome UI; Lucide icons; no emoji.
- Every job state change appends a `JobEvent`.

---

## File map

```
NEW   lib/integrations/moss/index.ts          MossClient interface + pickImpl wiring
NEW   lib/integrations/moss/mock.ts           Deterministic in-memory mock (for tests + fallback)
NEW   lib/integrations/moss/live.ts           @inferedge/moss SDK client, Zod-validated
NEW   lib/store/seed-retrieval.ts             seedRetrievalOnce() — populates both stores
NEW   tests/integrations/moss.test.ts         Contract test for Moss mock
EDIT  lib/env.ts                              Add MOSS_* keys to Zod schema
EDIT  .env.example                            Add Moss section
EDIT  lib/types/event.ts                      Add "context_recalled" to JobEventKind
EDIT  components/dashboard/job-timeline.tsx   Add BookOpen icon for "context_recalled"
EDIT  lib/integrations/supermemory/live.ts    Real HTTP via fetch + Zod
EDIT  lib/orchestrator/run.ts                 buildRecallContext + Moss-first sourcing + event emit
EDIT  app/layout.tsx                          Call seedRetrievalOnce() after seedOnce()
EDIT  package.json                            pnpm add @inferedge/moss
```

---

## Task 1: Add Moss env vars + JobEvent kind + timeline icon

These are tiny, mechanical, and unblock everything else. Bundle and commit together.

**Files:**
- Modify: `lib/env.ts`
- Modify: `.env.example`
- Modify: `lib/types/event.ts`
- Modify: `components/dashboard/job-timeline.tsx`

- [ ] **Step 1: Add Moss vars to the Zod env schema**

In `lib/env.ts`, append inside the `EnvSchema = z.object({ ... })` (after the existing `SUPERMEMORY_*` block, before `BROWSERUSE_*`). Coordinate with the concurrent edit to `AGENTPHONE_AGENT_ID` — do not delete it.

```ts
  MOSS_PROJECT_ID: z.string().optional(),
  MOSS_PROJECT_KEY: z.string().optional(),
  MOSS_CONTRACTORS_INDEX: z.string().default("cma_contractors_v1"),
  MOSS_KNOWLEDGE_INDEX: z.string().default("cma_knowledge_v1"),
```

- [ ] **Step 2: Mirror the Moss section in `.env.example`**

Append after the Supermemory block:

```
# Moss — sub-10ms semantic search runtime (@inferedge/moss)
MOSS_PROJECT_ID=
MOSS_PROJECT_KEY=
MOSS_CONTRACTORS_INDEX=cma_contractors_v1
MOSS_KNOWLEDGE_INDEX=cma_knowledge_v1
```

- [ ] **Step 3: Add `"context_recalled"` to `JobEventKind`**

In `lib/types/event.ts`, replace the entire union:

```ts
export type JobEventKind =
  | "call_received"
  | "intent_classified"
  | "diagnosed"
  | "context_recalled"
  | "contractor_search_started"
  | "contractor_search_completed"
  | "contractor_dial_started"
  | "contractor_dial_outcome"
  | "contractor_assigned"
  | "scheduled"
  | "work_started"
  | "work_completed"
  | "survey_sent"
  | "survey_completed"
  | "invoice_sent"
  | "paid"
  | "note";
```

- [ ] **Step 4: Add timeline icon for `context_recalled`**

In `components/dashboard/job-timeline.tsx`, edit the lucide import line and the `iconFor` record:

```ts
import {
  Phone,
  Brain,
  Stethoscope,
  Search,
  BookOpen,
  ListChecks,
  PhoneOutgoing,
  PhoneCall,
  UserCheck,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  MailQuestion,
  Star,
  Receipt,
  DollarSign,
  StickyNote,
} from "lucide-react";
```

Then in `iconFor`, add a single line between `diagnosed` and `contractor_search_started`:

```ts
  diagnosed: Stethoscope,
  context_recalled: BookOpen,
  contractor_search_started: Search,
```

- [ ] **Step 5: Type-check that nothing else broke**

Run: `pnpm tsc --noEmit`
Expected: clean (any errors must be from another session's in-flight work, not these edits).

- [ ] **Step 6: Commit**

```bash
git add lib/env.ts .env.example lib/types/event.ts components/dashboard/job-timeline.tsx
git commit -m "feat: scaffold moss env + context_recalled event kind"
```

---

## Task 2: Install Moss SDK + define Moss client interface

**Files:**
- Modify: `package.json` (via `pnpm add`)
- Create: `lib/integrations/moss/index.ts`

- [ ] **Step 1: Install `@inferedge/moss`**

Run: `pnpm add @inferedge/moss`
Expected: package added to `dependencies`; lockfile updated. If install fails (e.g. registry hiccup), stop and report.

- [ ] **Step 2: Verify the SDK exports**

Run: `node -e "console.log(Object.keys(require('@inferedge/moss')))"`
Note the exported names (likely `MossClient`, `createClient`, or default). Use this to inform the live import in Task 4; the interface in this task does not depend on it.

- [ ] **Step 3: Create the Moss client interface**

Write `lib/integrations/moss/index.ts`:

```ts
import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";
import type { Trade } from "@/lib/types";

export interface MossContractorRecord {
  contractorId: string;
  name: string;
  trades: Trade[];
  city: string;
  specialties: string[];
  rating?: number;
}

export interface MossKnowledgeRecord {
  id: string;
  text: string;
  tags: string[];
}

export interface MossClient {
  init(): Promise<void>;
  indexContractor(record: MossContractorRecord): Promise<void>;
  indexKnowledge(record: MossKnowledgeRecord): Promise<void>;
  searchContractors(input: {
    trade: Trade;
    city: string;
    problem: string;
    topK?: number;
  }): Promise<{ hits: { contractorId: string; score: number }[] }>;
  searchKnowledge(input: {
    query: string;
    topK?: number;
  }): Promise<{ hits: { id: string; text: string; score: number }[] }>;
}

export const moss: MossClient = pickImpl<MossClient>("moss", {
  mock: mock.moss,
  live: live.moss,
} satisfies AdapterModule<MossClient>);
```

Imports of `./mock` and `./live` will fail until Tasks 3 and 4 — that's expected; do not commit yet.

---

## Task 3: Moss mock + contract test (TDD)

The mock keeps `pnpm test` green and provides a fallback if Moss live dies on stage.

**Files:**
- Create: `tests/integrations/moss.test.ts`
- Create: `lib/integrations/moss/mock.ts`

- [ ] **Step 1: Write the contract test first**

Write `tests/integrations/moss.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { moss } from "@/lib/integrations/moss";

describe("moss mock", () => {
  beforeAll(async () => {
    await moss.init();
    await moss.indexContractor({
      contractorId: "ctr_test_001",
      name: "Acme Plumbing",
      trades: ["plumbing"],
      city: "San Francisco",
      specialties: ["leak", "kitchen sink", "emergency"],
      rating: 4.9,
    });
    await moss.indexContractor({
      contractorId: "ctr_test_002",
      name: "Marina Electric",
      trades: ["electrical"],
      city: "San Francisco",
      specialties: ["panel upgrade", "EV charger"],
      rating: 4.7,
    });
    await moss.indexKnowledge({
      id: "kb_test_001",
      text: "kitchen sink leak under cabinet → check supply line, p-trap, garbage disposal seal",
      tags: ["plumbing", "leak"],
    });
  });

  it("init is idempotent", async () => {
    await expect(moss.init()).resolves.toBeUndefined();
    await expect(moss.init()).resolves.toBeUndefined();
  });

  it("searchContractors returns hits with score", async () => {
    const out = await moss.searchContractors({
      trade: "plumbing",
      city: "San Francisco",
      problem: "leak under kitchen sink",
      topK: 5,
    });
    expect(Array.isArray(out.hits)).toBe(true);
    expect(out.hits.length).toBeGreaterThan(0);
    expect(out.hits[0]).toMatchObject({
      contractorId: expect.any(String),
      score: expect.any(Number),
    });
    expect(out.hits[0].contractorId).toBe("ctr_test_001");
  });

  it("searchKnowledge returns hits with text and score", async () => {
    const out = await moss.searchKnowledge({ query: "leak under sink", topK: 3 });
    expect(Array.isArray(out.hits)).toBe(true);
    expect(out.hits.length).toBeGreaterThan(0);
    expect(out.hits[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      score: expect.any(Number),
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/integrations/moss.test.ts`
Expected: FAIL — `Cannot find module './mock'` or similar (interface from Task 2 imports a missing mock file).

- [ ] **Step 3: Implement the mock**

Write `lib/integrations/moss/mock.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/integrations/moss.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Run the full suite to check nothing regressed**

Run: `pnpm test`
Expected: all existing tests still pass (`agentphone-webhook.test.ts` and `adapters.test.ts` should be unchanged).

- [ ] **Step 6: Commit**

```bash
git add lib/integrations/moss/index.ts lib/integrations/moss/mock.ts tests/integrations/moss.test.ts package.json pnpm-lock.yaml
git commit -m "feat: moss adapter scaffold + mock with contract tests"
```

---

## Task 4: Moss live adapter (real SDK)

**Files:**
- Create: `lib/integrations/moss/live.ts`

- [ ] **Step 1: Re-verify the `@inferedge/moss` API surface**

Run: `node -e "const m = require('@inferedge/moss'); console.log(Object.keys(m)); console.log(Object.keys(m.default ?? {}));"`

Also check: `cat node_modules/@inferedge/moss/README.md 2>/dev/null | head -60`

Note the actual function name(s) for: creating a client, opening/creating an index, upserting documents, and running a search. The exact names go into Step 2. **Do not guess** — read the package's README or `index.d.ts`. If shapes differ from the assumptions in Step 2, edit Step 2 accordingly before writing the file.

- [ ] **Step 2: Implement `lib/integrations/moss/live.ts`**

Use this skeleton; substitute the actual SDK call names you found in Step 1 where marked with `// SDK:`. Zod-validate the SDK response at the boundary.

```ts
import { z } from "zod";
import * as MossSDK from "@inferedge/moss";
import { env } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/adapter";
import type {
  MossClient,
  MossContractorRecord,
  MossKnowledgeRecord,
} from "./index";

const HitSchema = z.object({
  id: z.string(),
  score: z.number(),
  payload: z.record(z.string(), z.unknown()).optional(),
});
const SearchResponseSchema = z.object({
  hits: z.array(HitSchema),
});

let clientPromise: Promise<unknown> | null = null;

async function getClient(): Promise<unknown> {
  if (!env.MOSS_PROJECT_KEY || !env.MOSS_PROJECT_ID) {
    throw new IntegrationError(
      "moss",
      "MOSS_PROJECT_KEY or MOSS_PROJECT_ID missing — cannot use live moss. Set both in .env.local or switch MOSS_MODE=mock.",
    );
  }
  if (!clientPromise) {
    clientPromise = (async () => {
      // SDK: replace with actual constructor or createClient call.
      // Example shapes encountered in the wild:
      //   const c = new MossSDK.MossClient({ projectId, projectKey });
      //   const c = MossSDK.createClient({ projectId, projectKey });
      const c = await (MossSDK as unknown as {
        createClient?: (opts: { projectId: string; projectKey: string }) => Promise<unknown>;
        MossClient?: new (opts: { projectId: string; projectKey: string }) => unknown;
      });
      if ("createClient" in c && typeof c.createClient === "function") {
        return c.createClient({
          projectId: env.MOSS_PROJECT_ID!,
          projectKey: env.MOSS_PROJECT_KEY!,
        });
      }
      if ("MossClient" in c && typeof c.MossClient === "function") {
        return new c.MossClient({
          projectId: env.MOSS_PROJECT_ID!,
          projectKey: env.MOSS_PROJECT_KEY!,
        });
      }
      throw new IntegrationError("moss", "Unrecognized @inferedge/moss SDK export shape; update live.ts.");
    })().catch((cause) => {
      clientPromise = null;
      throw cause instanceof IntegrationError
        ? cause
        : new IntegrationError("moss", "client init failed", cause);
    });
  }
  return clientPromise;
}

async function upsert(indexName: string, id: string, payload: Record<string, unknown>): Promise<void> {
  const client = (await getClient()) as {
    upsert: (input: { index: string; id: string; payload: Record<string, unknown> }) => Promise<void>;
  };
  try {
    // SDK: replace with the actual upsert call (may be `index.upsert`, `addDocument`, `add`, etc.)
    await client.upsert({ index: indexName, id, payload });
  } catch (cause) {
    throw new IntegrationError("moss", `upsert into ${indexName} failed`, cause);
  }
}

async function search(
  indexName: string,
  query: string,
  topK: number,
): Promise<{ id: string; score: number; payload?: Record<string, unknown> }[]> {
  const start = Date.now();
  const client = (await getClient()) as {
    search: (input: { index: string; query: string; topK: number }) => Promise<unknown>;
  };
  try {
    // SDK: replace with actual search call (may be `query`, `find`, `search`).
    const raw = await client.search({ index: indexName, query, topK });
    const parsed = SearchResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new IntegrationError("moss", `unexpected search response shape: ${parsed.error.message}`);
    }
    const ms = Date.now() - start;
    if (ms > 50) console.warn(`[moss] ${indexName} query took ${ms}ms`);
    return parsed.data.hits;
  } catch (cause) {
    if (cause instanceof IntegrationError) throw cause;
    throw new IntegrationError("moss", `search ${indexName} failed`, cause);
  }
}

export const moss: MossClient = {
  async init() {
    await getClient();
  },

  async indexContractor(record: MossContractorRecord) {
    await upsert(env.MOSS_CONTRACTORS_INDEX, record.contractorId, {
      name: record.name,
      trades: record.trades,
      city: record.city,
      specialties: record.specialties,
      rating: record.rating,
      // The embedding source: concatenated text the SDK will encode.
      text: `${record.trades.join(" ")} ${record.city} ${record.name} ${record.specialties.join(" ")}`,
    });
  },

  async indexKnowledge(record: MossKnowledgeRecord) {
    await upsert(env.MOSS_KNOWLEDGE_INDEX, record.id, {
      text: record.text,
      tags: record.tags,
    });
  },

  async searchContractors({ trade, city, problem, topK }) {
    const query = `${trade} ${city} ${problem}`;
    const hits = await search(env.MOSS_CONTRACTORS_INDEX, query, topK ?? 5);
    return { hits: hits.map((h) => ({ contractorId: h.id, score: h.score })) };
  },

  async searchKnowledge({ query, topK }) {
    const hits = await search(env.MOSS_KNOWLEDGE_INDEX, query, topK ?? 3);
    return {
      hits: hits.map((h) => ({
        id: h.id,
        text: (h.payload?.text as string | undefined) ?? "",
        score: h.score,
      })),
    };
  },
};
```

**If after Step 1 the SDK shape differs significantly** (e.g. it exposes an `Index` object instead of top-level upsert/search): adjust the helpers `upsert` and `search` accordingly, but keep the exported `moss: MossClient` shape unchanged so consumers see no diff.

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: clean. If errors, fix the SDK call surface based on what you found in Step 1.

- [ ] **Step 4: Manual smoke (live)**

Run a one-shot probe script — `node --loader ts-node/esm <(echo "import { moss } from './lib/integrations/moss'; await moss.init(); console.log('moss init OK');")` won't work cleanly here. Instead, add a temporary test file:

Write `tests/integrations/moss-live.smoke.ts.skip` (note the `.skip` — Vitest will not run it):

```ts
// Run manually with: pnpm vitest run tests/integrations/moss-live.smoke.ts.skip --no-coverage
// Requires real MOSS_PROJECT_ID + MOSS_PROJECT_KEY + MOSS_MODE=live in .env.local.
import { describe, it, expect } from "vitest";
import { moss } from "@/lib/integrations/moss";

describe("moss live smoke", () => {
  it("can init and search", async () => {
    await moss.init();
    await moss.indexKnowledge({
      id: "kb_smoke_001",
      text: "kitchen sink leak troubleshooting guide",
      tags: ["plumbing", "smoke"],
    });
    const out = await moss.searchKnowledge({ query: "leak", topK: 3 });
    expect(Array.isArray(out.hits)).toBe(true);
  });
});
```

This file exists for manual stage-day verification; don't run it from CI.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/moss/live.ts tests/integrations/moss-live.smoke.ts.skip
git commit -m "feat: moss live adapter wired against @inferedge/moss"
```

---

## Task 5: Wire Supermemory live HTTP client

**Files:**
- Modify: `lib/integrations/supermemory/live.ts` (replace entire file)
- Create: `tests/integrations/supermemory-live.test.ts`

- [ ] **Step 1: Confirm the live API shape**

Run: `curl -sS -X POST https://api.supermemory.ai/v1/search -H "Authorization: Bearer $SUPERMEMORY_API_KEY" -H "Content-Type: application/json" -d '{"query":"test","topK":1}' | head -c 500`

Note the exact response keys (`memories`, `results`, `hits`?) and the endpoint path that returned 200. If the v1 path 404s, try `/search`, `/v3/search`, or check the Supermemory dashboard for the current API base. Lock the shape into the Zod schema in Step 3 based on what comes back.

- [ ] **Step 2: Write the test (using fetch mock)**

Write `tests/integrations/supermemory-live.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIG_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  process.env.SUPERMEMORY_MODE = "live";
  process.env.SUPERMEMORY_API_KEY = "test_key";
  process.env.SUPERMEMORY_PROJECT_ID = "test_proj";
});

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  delete process.env.SUPERMEMORY_MODE;
  delete process.env.SUPERMEMORY_API_KEY;
  delete process.env.SUPERMEMORY_PROJECT_ID;
});

describe("supermemory live", () => {
  it("recall: posts to /v1/search and returns memories", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/api\.supermemory\.ai/);
      expect(String(input)).toMatch(/\/v1\/search/);
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test_key");
      expect((init?.headers as Record<string, string>)["x-project-id"]).toBe("test_proj");
      return new Response(
        JSON.stringify({
          memories: [
            { id: "mem_1", text: "Prior leak at 415 Mission Unit 4B fixed by AcmePlumb", score: 0.91 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    const out = await supermemory.recall({ query: "leak", topK: 3 });
    expect(out.memories).toHaveLength(1);
    expect(out.memories[0]).toMatchObject({
      id: "mem_1",
      text: expect.any(String),
      score: expect.any(Number),
    });
  });

  it("remember: posts to /v1/memories and returns id", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toMatch(/\/v1\/memories/);
      return new Response(JSON.stringify({ id: "mem_new_42" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    const out = await supermemory.remember({
      text: "Test memory",
      tags: ["job", "plumbing"],
      metadata: { jobId: "job_1" },
    });
    expect(out).toMatchObject({ id: expect.any(String) });
  });

  it("throws IntegrationError when API key is missing", async () => {
    delete process.env.SUPERMEMORY_API_KEY;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    await expect(supermemory.recall({ query: "x" })).rejects.toThrow(/SUPERMEMORY_API_KEY/);
  });
});
```

- [ ] **Step 3: Run the test — expect failure**

Run: `pnpm vitest run tests/integrations/supermemory-live.test.ts`
Expected: FAIL — current `live.ts` throws `IntegrationError("supermemory", "recall live implementation is a TODO...")`.

- [ ] **Step 4: Replace `lib/integrations/supermemory/live.ts`**

Adjust endpoint paths and response keys to match what Step 1 returned. Below assumes the shape from the existing stub comment.

```ts
import { z } from "zod";
import { env } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/adapter";
import type { SupermemoryClient } from "./index";

const BASE_URL = "https://api.supermemory.ai";

const MemorySchema = z.object({
  id: z.string(),
  text: z.string(),
  score: z.number(),
});
const RecallResponseSchema = z.object({
  memories: z.array(MemorySchema),
});
const RememberResponseSchema = z.object({
  id: z.string(),
});

function requireKeys(method: string): { apiKey: string; projectId: string | undefined } {
  if (!env.SUPERMEMORY_API_KEY) {
    throw new IntegrationError(
      "supermemory",
      `SUPERMEMORY_API_KEY missing — cannot call ${method} in live mode.`,
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

export const supermemory: SupermemoryClient = {
  async recall({ query, topK }) {
    const { apiKey, projectId } = requireKeys("recall");
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/v1/search`, {
        method: "POST",
        headers: authHeaders(apiKey, projectId),
        body: JSON.stringify({ query, topK: topK ?? 3 }),
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
    const parsed = RecallResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntegrationError("supermemory", `recall response shape mismatch: ${parsed.error.message}`);
    }
    return { memories: parsed.data.memories };
  },

  async remember({ text, tags, metadata }) {
    const { apiKey, projectId } = requireKeys("remember");
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/v1/memories`, {
        method: "POST",
        headers: authHeaders(apiKey, projectId),
        body: JSON.stringify({ text, tags, metadata }),
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
    const parsed = RememberResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntegrationError("supermemory", `remember response shape mismatch: ${parsed.error.message}`);
    }
    return { id: parsed.data.id };
  },
};
```

- [ ] **Step 5: Run the test — expect pass**

Run: `pnpm vitest run tests/integrations/supermemory-live.test.ts`
Expected: 3 tests pass.

- [ ] **Step 6: Full test suite**

Run: `pnpm test`
Expected: all tests pass (existing supermemory contract test in `adapters.test.ts` still hits the mock by default, unaffected by the live changes).

- [ ] **Step 7: Commit**

```bash
git add lib/integrations/supermemory/live.ts tests/integrations/supermemory-live.test.ts
git commit -m "feat: supermemory live adapter via fetch+zod"
```

---

## Task 6: Seed retrieval module

**Files:**
- Create: `lib/store/seed-retrieval.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Inspect existing seed for the property/contractor IDs to reference**

Run: `cat lib/store/seed.ts | head -100`
Note the seeded property addresses, owner names, and any existing contractor IDs. The Supermemory historical job summaries below will reference them by address so recall lights up on demo calls.

- [ ] **Step 2: Write `lib/store/seed-retrieval.ts`**

Use the property addresses you found in Step 1. Replace `"415 Mission St"`, `"342 Valencia St"`, etc. below with whatever the actual seeded properties are. If the seeded set is different, adjust the historical jobs and owner preferences accordingly.

```ts
import { store } from "@/lib/store/memory";
import { moss } from "@/lib/integrations/moss";
import { supermemory } from "@/lib/integrations/supermemory";

let seeded = false;

const SEED_CONTRACTORS = [
  { name: "AcmePlumb", phone: "+14155550101", trades: ["plumbing"], city: "San Francisco", rating: 4.9, specialties: ["leak", "kitchen sink", "p-trap", "emergency 24h", "garbage disposal"] },
  { name: "Bay Drain Pros", phone: "+14155550102", trades: ["plumbing"], city: "San Francisco", rating: 4.7, specialties: ["drain cleaning", "hydro jet", "sewer line"] },
  { name: "Mission Plumbing & Heating", phone: "+14155550103", trades: ["plumbing", "hvac"], city: "San Francisco", rating: 4.8, specialties: ["boiler", "water heater", "victorian old plumbing"] },
  { name: "SF Quick Locks", phone: "+14155550104", trades: ["locksmith"], city: "San Francisco", rating: 4.9, specialties: ["deadbolt rekey", "lockout", "smart lock install"] },
  { name: "Sunset Locksmith", phone: "+14155550105", trades: ["locksmith"], city: "San Francisco", rating: 4.6, specialties: ["emergency lockout", "key duplication"] },
  { name: "Marina Electric", phone: "+14155550106", trades: ["electrical"], city: "San Francisco", rating: 4.8, specialties: ["panel upgrade", "code-compliant rewires", "EV charger install"] },
  { name: "Hayes Wiring Co", phone: "+14155550107", trades: ["electrical"], city: "San Francisco", rating: 4.7, specialties: ["GFCI", "lighting", "circuit tracing"] },
  { name: "Bayview Electric Service", phone: "+14155550108", trades: ["electrical"], city: "San Francisco", rating: 4.5, specialties: ["commercial", "tenant improvement"] },
  { name: "Cool Bay HVAC", phone: "+14155550109", trades: ["hvac"], city: "San Francisco", rating: 4.8, specialties: ["AC", "heat pump", "thermostat"] },
  { name: "Golden Gate Heating", phone: "+14155550110", trades: ["hvac"], city: "San Francisco", rating: 4.7, specialties: ["furnace", "boiler", "ductless mini-split"] },
  { name: "Mission Appliance Repair", phone: "+14155550111", trades: ["appliance"], city: "San Francisco", rating: 4.6, specialties: ["dishwasher", "washer", "dryer", "fridge"] },
  { name: "Bay Appliance Techs", phone: "+14155550112", trades: ["appliance"], city: "San Francisco", rating: 4.8, specialties: ["range", "oven", "ice maker"] },
  { name: "Sunset Roofing", phone: "+14155550113", trades: ["roofing"], city: "San Francisco", rating: 4.7, specialties: ["leak repair", "flat roof", "gutters"] },
  { name: "Pacific Roof Co", phone: "+14155550114", trades: ["roofing"], city: "San Francisco", rating: 4.6, specialties: ["torch down", "skylight"] },
  { name: "Castro Pest Solutions", phone: "+14155550115", trades: ["pest_control"], city: "San Francisco", rating: 4.7, specialties: ["roaches", "rodents", "bedbugs"] },
  { name: "SF Eco Pest", phone: "+14155550116", trades: ["pest_control"], city: "San Francisco", rating: 4.5, specialties: ["green treatment", "ants"] },
  { name: "FreshClean SF", phone: "+14155550117", trades: ["cleaning"], city: "San Francisco", rating: 4.8, specialties: ["move-out", "deep clean", "carpet"] },
  { name: "Mission Handyman", phone: "+14155550118", trades: ["general"], city: "San Francisco", rating: 4.7, specialties: ["drywall patch", "paint touch-up", "TV mount"] },
  { name: "Richmond Garden Crew", phone: "+14155550119", trades: ["landscaping"], city: "San Francisco", rating: 4.6, specialties: ["pruning", "drought-tolerant", "irrigation"] },
  { name: "Excelsior General Repair", phone: "+14155550120", trades: ["general"], city: "San Francisco", rating: 4.5, specialties: ["odd jobs", "fence", "door fit"] },
] as const;

const SEED_KNOWLEDGE = [
  { id: "kb_001", text: "Kitchen sink leak under cabinet → check supply line first, then p-trap, then garbage disposal seal.", tags: ["plumbing", "leak", "kitchen"] },
  { id: "kb_002", text: "Front door key won't turn → lubricate cylinder + bump-key check before drilling.", tags: ["locksmith", "lockout"] },
  { id: "kb_003", text: "No hot water on gas heater → check pilot light, thermocouple, gas valve in that order.", tags: ["plumbing", "hvac", "water heater"] },
  { id: "kb_004", text: "Circuit breaker tripping repeatedly → identify load, then check GFCI outlets in kitchens and bathrooms first.", tags: ["electrical", "breaker"] },
  { id: "kb_005", text: "AC won't cool → thermostat batteries, dirty filter, condenser coil, refrigerant level.", tags: ["hvac", "ac"] },
  { id: "kb_006", text: "Dishwasher won't drain → garbage disposal knockout plug, air gap clog, drain hose kink.", tags: ["appliance", "dishwasher"] },
  { id: "kb_007", text: "Toilet keeps running → flapper seal, fill valve, chain length adjustment.", tags: ["plumbing", "toilet"] },
  { id: "kb_008", text: "Garage door won't close → safety sensor alignment is the most common cause; check LED first.", tags: ["general", "garage"] },
  { id: "kb_009", text: "Smoke detector chirping → 9V battery replacement + check detector age (10yr lifespan).", tags: ["general", "safety"] },
  { id: "kb_010", text: "Low water pressure at single fixture → unscrew and clean aerator before suspecting the supply line.", tags: ["plumbing", "pressure"] },
];

// Tied to the seeded properties — update the addresses to match lib/store/seed.ts.
const SEED_PAST_JOBS = [
  { text: "Job j_hist_01 at 415 Mission St Unit 4B — kitchen sink leak resolved by AcmePlumb on 2026-04-12. Cost $215, on-site within 45min, tenant rated 5★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_seed_1", contractorName: "AcmePlumb", rating: 5 } },
  { text: "Job j_hist_02 at 415 Mission St Unit 4B — bathroom lockout resolved by SF Quick Locks on 2026-02-03. Cost $145, on-site within 30min, tenant rated 5★.", tags: ["job", "locksmith"], metadata: { propertyId: "prop_seed_1", contractorName: "SF Quick Locks", rating: 5 } },
  { text: "Job j_hist_03 at 342 Valencia St — circuit breaker tripping resolved by Marina Electric on 2026-03-22. Cost $325, tenant rated 4★. Note: faulty appliance was the load.", tags: ["job", "electrical"], metadata: { propertyId: "prop_seed_2", contractorName: "Marina Electric", rating: 4 } },
  { text: "Job j_hist_04 at 342 Valencia St — dishwasher not draining resolved by Mission Appliance Repair on 2026-01-15. Cost $180, tenant rated 5★.", tags: ["job", "appliance"], metadata: { propertyId: "prop_seed_2", contractorName: "Mission Appliance Repair", rating: 5 } },
  { text: "Job j_hist_05 at 1247 Geary Blvd — no hot water resolved by Mission Plumbing & Heating on 2026-04-28. Cost $410, water heater replaced, tenant rated 5★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_seed_3", contractorName: "Mission Plumbing & Heating", rating: 5 } },
  { text: "Job j_hist_06 at 1247 Geary Blvd — AC inoperative resolved by Cool Bay HVAC on 2026-05-02. Cost $285, capacitor replaced, tenant rated 5★.", tags: ["job", "hvac"], metadata: { propertyId: "prop_seed_3", contractorName: "Cool Bay HVAC", rating: 5 } },
  { text: "Job j_hist_07 at 88 Hayes St — running toilet resolved by Bay Drain Pros on 2026-03-08. Cost $95, fill valve replaced, tenant rated 4★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_seed_4", contractorName: "Bay Drain Pros", rating: 4 } },
  { text: "Job j_hist_08 at 88 Hayes St — bedroom outlet sparking resolved by Hayes Wiring Co on 2026-04-30. Cost $260, tenant rated 5★. Critical safety issue, same-day service.", tags: ["job", "electrical"], metadata: { propertyId: "prop_seed_4", contractorName: "Hayes Wiring Co", rating: 5 } },
];

const SEED_OWNER_PREFS = [
  { text: "Owner Marcus Webb (415 Mission St portfolio) prefers insured contractors only, no work after 7pm, accepts callbacks via SMS.", tags: ["preference", "owner"], metadata: { propertyId: "prop_seed_1" } },
  { text: "Owner Elena Park (342 Valencia St) requires Cal-licensed contractors for all electrical work, prefers female contractors when available, OK with 8am–6pm appointments.", tags: ["preference", "owner"], metadata: { propertyId: "prop_seed_2" } },
  { text: "Owner Property Group LLC (1247 Geary Blvd, 88 Hayes St) authorizes up to $500 without approval; anything higher needs PM sign-off.", tags: ["preference", "owner"], metadata: { propertyId: "prop_seed_3" } },
];

export async function seedRetrievalOnce(): Promise<void> {
  if (seeded) return;
  seeded = true;

  // 1. Push contractors into both Moss and the in-memory store so dashboard
  //    shows them and Moss can rank them on call recall.
  for (let i = 0; i < SEED_CONTRACTORS.length; i++) {
    const c = SEED_CONTRACTORS[i];
    const contractorId = `ctr_seed_${(i + 1).toString().padStart(3, "0")}`;
    try {
      store.upsertContractor({
        id: contractorId,
        name: c.name,
        phone: c.phone,
        trades: [...c.trades],
        rating: c.rating,
        city: c.city,
        source: "directory",
      });
    } catch (e) {
      console.warn(`[seed-retrieval] upsertContractor failed for ${contractorId}:`, e);
    }
    try {
      await moss.indexContractor({
        contractorId,
        name: c.name,
        trades: [...c.trades],
        city: c.city,
        specialties: [...c.specialties],
        rating: c.rating,
      });
    } catch (e) {
      console.warn(`[seed-retrieval] moss.indexContractor failed for ${contractorId}:`, e);
    }
  }

  // 2. Knowledge index.
  for (const k of SEED_KNOWLEDGE) {
    try {
      await moss.indexKnowledge(k);
    } catch (e) {
      console.warn(`[seed-retrieval] moss.indexKnowledge failed for ${k.id}:`, e);
    }
  }

  // 3. Supermemory historical jobs + owner preferences.
  for (const m of [...SEED_PAST_JOBS, ...SEED_OWNER_PREFS]) {
    try {
      await supermemory.remember({ text: m.text, tags: m.tags, metadata: m.metadata });
    } catch (e) {
      console.warn(`[seed-retrieval] supermemory.remember failed:`, e);
    }
  }
}
```

- [ ] **Step 3: Wire `seedRetrievalOnce()` into the app boot path**

Modify `app/layout.tsx` near the top. The existing seed call stays; the new one fires alongside it. Because layout runs on the server at request time, fire-and-forget is fine for hackathon timing — but log on failure.

```ts
import { seedOnce } from "@/lib/store/seed";
import { seedRetrievalOnce } from "@/lib/store/seed-retrieval";

seedOnce();
void seedRetrievalOnce().catch((e) => {
  console.warn("[layout] seedRetrievalOnce failed:", e);
});
```

- [ ] **Step 4: Verify type-check + tests**

Run: `pnpm tsc --noEmit && pnpm test`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/store/seed-retrieval.ts app/layout.tsx
git commit -m "feat: seed moss + supermemory with demo catalog and history"
```

---

## Task 7: Orchestrator — `buildRecallContext` + Moss-first sourcing + event emit

**Files:**
- Modify: `lib/orchestrator/run.ts`

- [ ] **Step 1: Add `buildRecallContext` and modify `findContractorsForJob`**

Open `lib/orchestrator/run.ts`. Make four changes — keep all other code untouched.

**1a. Import `moss` alongside the other integrations near the top of the file:**

```ts
import { moss } from "@/lib/integrations/moss";
```

**1b. Add the `RecallContext` type and helper near the top of the file, after the imports and before `djb2`:**

```ts
export interface RecallContext {
  pastJobs: { id: string; text: string; score: number }[];
  ownerPreferences: { id: string; text: string; score: number }[];
  contractorHits: { contractorId: string; score: number }[];
  knowledgeHits: { id: string; text: string; score: number }[];
}

interface BuildRecallContextInput {
  trade: Trade;
  city: string;
  problem: string;
  address: string | undefined;
}

async function buildRecallContext(input: BuildRecallContextInput): Promise<RecallContext> {
  const recallQuery = `${input.address ?? "unknown"} ${input.trade}`;
  const knowledgeQuery = `${input.trade} ${input.problem}`;

  const [knowledgeRes, contractorRes, memoryRes] = await Promise.all([
    moss.searchKnowledge({ query: knowledgeQuery, topK: 3 }).catch((e) => {
      console.warn("[orchestrator] moss.searchKnowledge failed:", e);
      return { hits: [] as { id: string; text: string; score: number }[] };
    }),
    moss
      .searchContractors({
        trade: input.trade,
        city: input.city,
        problem: input.problem,
        topK: 5,
      })
      .catch((e) => {
        console.warn("[orchestrator] moss.searchContractors failed:", e);
        return { hits: [] as { contractorId: string; score: number }[] };
      }),
    supermemory.recall({ query: recallQuery, topK: 6 }).catch((e) => {
      console.warn("[orchestrator] supermemory.recall failed:", e);
      return { memories: [] as { id: string; text: string; score: number }[] };
    }),
  ]);

  // Owner prefs and past jobs come from the same Supermemory pool; split by tag-ish heuristics.
  const owner: RecallContext["ownerPreferences"] = [];
  const past: RecallContext["pastJobs"] = [];
  for (const m of memoryRes.memories) {
    if (/owner|prefer|portfolio|authoriz/i.test(m.text)) owner.push(m);
    else past.push(m);
  }

  return {
    pastJobs: past,
    ownerPreferences: owner,
    contractorHits: contractorRes.hits,
    knowledgeHits: knowledgeRes.hits,
  };
}
```

**1c. Change `FindContractorsInput` and the function body to accept and use `mossHits`:**

Replace the existing `FindContractorsInput` interface and the body of `findContractorsForJob`:

```ts
export interface FindContractorsInput {
  jobId: string;
  trade: Trade;
  city: string;
  mossHits?: { contractorId: string; score: number }[];
}

export interface FindContractorsResult {
  contractorIds: string[];
}

export async function findContractorsForJob(
  input: FindContractorsInput,
): Promise<FindContractorsResult> {
  const { jobId, trade, city, mossHits } = input;

  // Moss-first path: if we already have ≥3 ranked hits, use them directly.
  if (mossHits && mossHits.length >= 3) {
    const sorted = [...mossHits].sort((a, b) => b.score - a.score).slice(0, 5);
    const contractorIds = sorted
      .map((h) => h.contractorId)
      .filter((id) => store.contractors.has(id));

    store.appendEvent({
      jobId,
      kind: "contractor_search_completed",
      title: `Found ${contractorIds.length} candidates from Moss`,
      data: { contractorIds, source: "moss" },
    });

    return { contractorIds };
  }

  // Fallback: Browser Use sourcing (existing behavior, unchanged).
  const { candidates } = await browseruse.findContractors({
    trade,
    city,
    limit: 5,
  });

  const existing = store.listContractors();
  const byPhone = new Map<string, Contractor>();
  for (const c of existing) byPhone.set(c.phone, c);

  for (const cand of candidates) {
    if (byPhone.has(cand.phone)) continue;
    const created = store.upsertContractor({
      id: `ctr_${nanoid(8)}`,
      name: cand.name,
      phone: cand.phone,
      trades: [trade],
      rating: cand.rating,
      city,
      source: "browser_use",
    });
    byPhone.set(created.phone, created);
  }

  const all = store.listContractors().filter((c) => c.trades.includes(trade));
  const cityMatches = all.filter((c) => !c.city || c.city === city);
  const pool = cityMatches.length > 0 ? cityMatches : all;
  const ranked = pool
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);
  const contractorIds = ranked.map((c) => c.id);

  store.appendEvent({
    jobId,
    kind: "contractor_search_completed",
    title: `Found ${contractorIds.length} candidates`,
    data: { contractorIds, source: "browser_use" },
  });

  return { contractorIds };
}
```

**1d. Replace step 5 (current `Recall similar past jobs from Supermemory`) and step 6 in `runAgent`:**

Find the block that starts with `// 5. Recall similar past jobs from Supermemory.` and ends just before `// 7. Dial top 3 in parallel`. Replace it with:

```ts
  // 5. Recall context — Moss (catalog + knowledge) + Supermemory (history) in parallel.
  const ctx = await buildRecallContext({
    trade: intent.trade,
    city,
    problem: intent.description,
    address: property?.address,
  });

  store.appendEvent({
    jobId: job.id,
    kind: "context_recalled",
    title: `Recalled ${ctx.pastJobs.length} prior jobs · ${ctx.contractorHits.length} contractor matches · ${ctx.ownerPreferences.length} owner prefs`,
    detail:
      [
        ctx.knowledgeHits[0]?.text,
        ctx.pastJobs[0]?.text,
        ctx.ownerPreferences[0]?.text,
      ]
        .filter(Boolean)
        .slice(0, 2)
        .join(" · ") || undefined,
    data: {
      pastJobIds: ctx.pastJobs.map((j) => j.id),
      contractorIds: ctx.contractorHits.map((c) => c.contractorId),
      knowledgeIds: ctx.knowledgeHits.map((k) => k.id),
    },
  });

  // 6. Find contractors — Moss-first; falls back to Browser Use if <3 hits.
  store.appendEvent({
    jobId: job.id,
    kind: "contractor_search_started",
    title: `Searching for ${intent.trade} contractors in ${city}`,
  });
  const { contractorIds } = await findContractorsForJob({
    jobId: job.id,
    trade: intent.trade,
    city,
    mossHits: ctx.contractorHits,
  });
```

**1e. Update the final `supermemory.remember` call (existing step 10) to include richer text and tags:**

Find the existing remember call inside `if (winner)` and replace it with:

```ts
    // 10. Remember in Supermemory — richer text/tags improves future recall.
    try {
      const etaSuffix = winner.result.etaWindow ? `, eta ${winner.result.etaWindow}` : "";
      await supermemory.remember({
        text:
          `Job ${job.id} at ${property?.address ?? propertyId} — ` +
          `${intent.trade} (${intent.urgency}) assigned to ${contractor?.name ?? assignedContractorId}` +
          etaSuffix +
          ".",
        tags: ["job", intent.trade, "assignment"],
        metadata: {
          jobId: job.id,
          contractorId: assignedContractorId,
          propertyId,
          urgency: intent.urgency,
          outcome: "accepted_job",
        },
      });
    } catch (e) {
      console.warn("[orchestrator] supermemory.remember failed:", e);
    }
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: clean. If errors arise from the other session's concurrent edits to `run.ts`, resolve them by keeping their changes and reapplying the diffs above.

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: all tests pass. (`adapters.test.ts` is unaffected; nothing tests the orchestrator directly today.)

- [ ] **Step 4: Commit**

```bash
git add lib/orchestrator/run.ts
git commit -m "feat: orchestrator wires moss + supermemory recall + context_recalled event"
```

---

## Task 8: End-to-end smoke against the running dev server

Before this point, everything has been static + unit tests. Now exercise the real flow against the real APIs.

- [ ] **Step 1: Start the dev server in the background**

Run: `pnpm dev`
Expected: `Local: http://localhost:3000` appears in the output within ~10 seconds. Leave it running.

- [ ] **Step 2: Wait for first request to trigger seeding**

Run: `curl -sS http://localhost:3000/dashboard > /dev/null`
Look at the dev server logs. Expected: no `[seed-retrieval]` warn lines. If you see warns, the keys/env-vars are wrong — fix before continuing.

- [ ] **Step 3: Verify seed data is visible in the dashboard contractors page**

Run: `curl -sS http://localhost:3000/dashboard/contractors > /dev/null` (or open in a browser via `/browse`)
Expected: 20 contractors listed (the 19 seeded + the existing original seed, if any — exact count depends on whether the original seed adds contractors).

- [ ] **Step 4: Trigger a fresh inbound call**

Run:
```bash
CALL_RESP=$(curl -sS -X POST http://localhost:3000/api/calls/incoming \
  -H 'content-type: application/json' \
  -d '{"fromNumber":"+14155551410","transcript":"My kitchen sink is leaking again at 415 Mission Unit 4B"}')
echo "$CALL_RESP"
CALL_ID=$(echo "$CALL_RESP" | sed -n 's/.*"callId":"\([^"]*\)".*/\1/p')
echo "CALL_ID=$CALL_ID"
```

- [ ] **Step 5: Run the agent on the call**

```bash
curl -sS -X POST http://localhost:3000/api/agent/run \
  -H 'content-type: application/json' \
  -d "{\"callId\":\"$CALL_ID\"}"
```
Expected: returns `{ "jobId": "...", "contractorId": "ctr_seed_XXX" }`. The contractorId should start with `ctr_seed_` because Moss should have returned ≥3 hits for plumbing/SF and the Moss-first path was taken.

- [ ] **Step 6: Verify the timeline shows `context_recalled`**

Run: `curl -sS http://localhost:3000/api/jobs/$JOB_ID 2>/dev/null | head -c 2000`
Or open `/dashboard` and click into the job.
Expected: the job timeline includes a `context_recalled` event with title containing `Recalled <n> prior jobs · <n> contractor matches · <n> owner prefs`. For a fresh call against 415 Mission, n should be > 0 for past jobs and owner prefs (because seed data references that address) and > 0 for contractor matches.

- [ ] **Step 7: Acceptance check against the spec**

Walk through `docs/superpowers/specs/2026-05-17-supermemory-moss-retrieval-design.md` section 16:

1. `context recalled` chip appears within ~100ms of the call landing — verify via dev server log timestamps.
2. Browser Use was *not* called (no `[browseruse]` log lines, no `source: "browser_use"` in the `contractor_search_completed` event data) — confirm via the timeline data.
3. Recall round-trip: trigger a second call to the same address and verify the new memory from call 1 appears in `pastJobs`.
4. Single missing key: temporarily blank `MOSS_PROJECT_KEY` in `.env.local`, restart dev, trigger another call. Expected: orchestrator logs a warn, `context_recalled` event has `contractorHits: []`, Browser Use fallback fires. Restore the key.
5. `pnpm test` still green — run it one more time.

- [ ] **Step 8: Stop the dev server**

Kill the dev server process.

- [ ] **Step 9: Commit any tweaks discovered during smoke**

If Step 7 surfaced any small bugs (wrong env var name, missing await, etc.), fix them inline and commit with a descriptive message.

---

## Task 9: Deploy

Deployment is a separate explicit action — Nicolas has a "never deploy without approval" rule, but completing this task requires deploy approval already given in this session.

- [ ] **Step 1: Confirm with Nicolas before deploying**

Ask: "Plan complete, smoke passing locally. Deploy to Vercel prod?" Wait for explicit yes. Do not assume.

- [ ] **Step 2: Push to Vercel**

```bash
vercel deploy --prod --yes
```

- [ ] **Step 3: Verify production hits**

Run `curl -sS https://call-my-agent-psi.vercel.app/dashboard > /dev/null`. Then run the smoke flow from Task 8 against the production URL (substitute `localhost:3000` → `call-my-agent-psi.vercel.app`).

- [ ] **Step 4: Report back**

Share the new deployment URL + a one-line summary of what's live.

---

## Self-review (writing-plans skill checklist)

**Spec coverage:**

- §3 Architecture (Moss + Supermemory in parallel, Moss-first sourcing) → Task 7
- §4 Moss adapter (index/mock/live) → Tasks 2, 3, 4
- §5 Supermemory live HTTP → Task 5
- §6 Seeding (20 contractors / 10 knowledge / 8 past jobs / 3 owner prefs, idempotent) → Task 6
- §7 Orchestrator changes (steps 5, 6, 10) → Task 7
- §8 Type additions (`context_recalled`) → Task 1
- §9 Dashboard surfacing (timeline icon) → Task 1
- §10 Env additions → Task 1
- §11 Failure modes → covered in Tasks 5, 6, 7 (each catch logs + degrades) + Task 8 Step 7.4 verifies.
- §12 Observability (latency log) → Task 4 Step 2 (`if (ms > 50) console.warn`).
- §13 Files touched → all covered above.
- §14 Coordination with parallel session → Task 1 Step 1 calls out the `AGENTPHONE_AGENT_ID` line; Task 7 Step 2 notes conflict resolution.
- §15 Out of scope → no tasks (as intended).
- §16 Acceptance criteria → Task 8 Step 7 walks each one.

**Placeholder scan:** No "TBD" / "TODO" / "fill in" / "similar to". The Moss SDK shape unknowns in Task 4 are explicit "verify in Step 1, substitute in Step 2" instructions, not placeholders. The seed property addresses are flagged in Task 6 Step 1 with instructions to read the existing seed.ts.

**Type consistency:** `MossClient`, `MossContractorRecord`, `MossKnowledgeRecord`, `RecallContext`, `FindContractorsInput.mossHits`, `JobEventKind = "context_recalled"` — all spelled identically across tasks. `MOSS_PROJECT_KEY` and `MOSS_PROJECT_ID` consistent everywhere (post-spec-edit).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-17-supermemory-moss-retrieval.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
