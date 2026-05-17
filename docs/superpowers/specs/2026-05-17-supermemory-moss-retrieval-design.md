# Supermemory + Moss retrieval layer — design

**Status:** approved (verbal), pending written user review
**Date:** 2026-05-17
**Author:** Claude (this session) for Nicolas
**Hackathon ship target:** 2026-05-17, same day
**Companion plan:** to be written next via `superpowers:writing-plans`

---

## 1. Goal

Give the orchestrator a real two-tier retrieval system so the agent feels like it *remembers* and *knows* — not just routes calls.

- **Moss** = sub-10ms in-call semantic search over a seeded **catalog**: contractors and issue-pattern knowledge.
- **Supermemory** = durable cross-session **history**: prior jobs per property, owner preferences, satisfaction outcomes.

Both ship **live** today. Both are **seeded on boot** so judges see populated state from the first dashboard load.

## 2. Non-goals

- No new dashboard pages. One small timeline event addition only.
- No auth, no multi-tenant Moss/Supermemory project separation. v1 single project.
- No re-architecture of the existing in-memory `store`. It stays as the source of truth for the dashboard; Supermemory + Moss are *retrieval* surfaces consulted by the orchestrator.
- No mock-mode polish for the new code paths. Mocks exist only to keep `pnpm test` green. Demo path is live.

## 3. Architecture

Two retrieval clients, both behind the existing adapter pattern (`index.ts` / `mock.ts` / `live.ts`). They are consulted by the orchestrator at two specific seams:

```
runAgent(callId)
 1. fetch + merge transcript                                      (unchanged)
 2. gemini.classifyIntent                                         (unchanged)
 3. resolve property/reporter                                     (unchanged)
 4. upsert Job, link to call                                      (unchanged)

 5. recall context  ────────────────────────────────────────────  ★ NEW BEHAVIOR
      ├─ Promise.all([
      │     moss.searchKnowledge({ query: "<trade> <description>", topK: 3 }),
      │     moss.searchContractors({ trade, city, problem, topK: 5 }),
      │     supermemory.recall({ query: "<address> <trade>", topK: 3 }),
      │  ])
      ├─ shape into RecallContext
      ├─ append JobEvent kind "context_recalled" (new)
      └─ pass context downstream

 6. findContractorsForJob ──────────────────────────────────────  ★ MODIFIED
      ├─ Moss hits from step 5 are first-class candidates.
      ├─ If Moss returns ≥3 hits → skip Browser Use entirely.
      ├─ Else → call browseruse.findContractors() to fill the gap.
      └─ Merge unique by phone, upsert into store, return top-5 by rating.

 7. dial top 3 in parallel, Promise.any race                      (unchanged)
 8. gemini.draftContractorScript                                  (★ now receives RecallContext)
 9. assign winner / store events                                   (unchanged)

10. persist outcome ──────────────────────────────────────────── ★ MODIFIED
      └─ supermemory.remember({ text, tags, metadata })  ← interface unchanged,
         but text is now structured ("Job <id> assigned to <name> for <address>;
         outcome=accepted_job; eta=<window>") for better future recall.
```

`RecallContext` shape:

```ts
interface RecallContext {
  pastJobs: { id: string; text: string; score: number }[];       // from Supermemory
  ownerPreferences: { id: string; text: string; score: number }[]; // from Supermemory, filtered by tag
  contractorHits: { contractorId: string; score: number }[];     // from Moss
  knowledgeHits: { id: string; text: string; score: number }[];  // from Moss
}
```

## 4. Moss adapter — `lib/integrations/moss/`

### 4.1 `index.ts`

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
  specialties: string[];      // free-text tokens that feed the embedding
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

### 4.2 `live.ts`

- Imports `@inferedge/moss` (JS SDK, npm package). Installed via `pnpm add @inferedge/moss`.
- Two named indexes: `env.MOSS_CONTRACTORS_INDEX` (default `cma_contractors_v1`), `env.MOSS_KNOWLEDGE_INDEX` (default `cma_knowledge_v1`).
- Init is lazy and idempotent — guarded by a module-level `Promise<void>` so concurrent first-callers share one init.
- `searchContractors` query string is `${trade} ${city} ${problem}` so the trade/city act as embedding tokens. The returned hit IDs are stored contractor IDs (`ctr_*`) — Moss is the index, the dashboard store is the system of record.
- All SDK errors wrapped in `IntegrationError("moss", …, cause)`.
- All return shapes Zod-validated at the boundary before being handed to orchestrator.

### 4.3 `mock.ts`

- Trivial in-memory `Map<string, MossContractorRecord>` + `Map<string, MossKnowledgeRecord>`.
- Search = naive token overlap, same deterministic style as the existing Supermemory mock.
- Exists solely so `pnpm test` and demo fallback work. Not optimized.

### 4.4 Mode resolution

Follows existing `pickImpl` rules. With `INTEGRATION_MODE=live` it goes live; per-vendor override via `MOSS_MODE=mock` available if a live key dies on stage.

## 5. Supermemory `live.ts` — wire the stub

Replace the `notWired()` calls with real HTTP. Endpoints verified against current docs *before* sending the first live request (the existing stub comment says "verify before shipping" — that check is part of the implementation, not optional).

Expected shape (subject to live-doc verification):

- `POST https://api.supermemory.ai/v1/search`
  - Body: `{ query, topK }`
  - Headers: `Authorization: Bearer ${SUPERMEMORY_API_KEY}`, `x-project-id: ${SUPERMEMORY_PROJECT_ID}`, `content-type: application/json`
  - Response Zod schema: `{ memories: { id: string; text: string; score: number }[] }`
- `POST https://api.supermemory.ai/v1/memories`
  - Body: `{ text, tags?, metadata? }`
  - Response Zod schema: `{ id: string }`

Failure handling:
- `IntegrationError("supermemory", "<message>", cause)` on non-2xx or schema mismatch.
- Orchestrator's existing try/catch keeps recall/remember failures non-fatal — confirmed not changed.
- Missing `SUPERMEMORY_API_KEY` raises the existing `notWired`-style error message with remediation text.

Tag conventions written by orchestrator:
- `["job", trade, "assignment"]` — assignment events
- `["job", trade, "outcome", outcome]` — dial outcomes
- `["preference", "owner"]` — seeded owner preferences (read-only at runtime)
- `["survey", rating]` — post-call satisfaction surveys (future, not in this spec but tag pre-reserved)

## 6. Seeding — `lib/store/seed-retrieval.ts`

Exports a single `seedRetrievalOnce()` that the layout invokes after the existing `seedOnce()`. Idempotent: it checks a module-level boolean and an optional Moss index count probe.

Three buckets:

### 6.1 Moss `cma_contractors_v1` — 20 contractors

Across plumbing, electrical, HVAC, appliance, locksmith, roofing, general — SF-area neighborhoods (Mission, SoMa, Sunset, Marina, Hayes Valley, Excelsior, Richmond). Each entry:
- `contractorId` — also `store.upsertContractor()`-ed so dashboard contractors page is populated.
- `trades`, `city`, `rating` (4.2 – 5.0).
- `specialties` — short text tokens like "emergency 24h", "victorian old plumbing", "code-compliant rewires", "deadbolt rekey", "garbage disposal", "boiler repair", "EV charger install". These drive embedding quality.

### 6.2 Moss `cma_knowledge_v1` — 10 issue patterns

Short, expert-tone troubleshooting docs that read well in the dashboard chip:
- "kitchen sink leak under cabinet → check supply line first, then p-trap, then garbage disposal seal"
- "front door key won't turn → lubricate cylinder + bump-key check before drilling"
- "no hot water + gas heater → pilot light, thermocouple, gas valve"
- "circuit breaker tripping → identify load, look for GFCI in bathroom/kitchen first"
- "AC won't cool → thermostat batteries, filter, condenser coil, refrigerant"
- "dishwasher not draining → garbage disposal knockout, air gap, drain hose"
- "running toilet → flapper, fill valve, chain length"
- "garage door won't close → safety sensor alignment first"
- "smoke detector chirping → 9v battery + 10yr replacement check"
- "low water pressure single fixture → aerator clog"

### 6.3 Supermemory — 8 historical jobs + 3 owner preferences

Tied to the **existing** seeded properties so a fresh call into the demo lands on a property with real recall hits.

- 8 prior-job summaries (`text`, `tags: ["job", <trade>]`, `metadata: { jobId, propertyId, contractorId, completedAt, ratingStars }`). Example: `"Job j_5e1f at 415 Mission Unit 4B — kitchen sink leak resolved by AcmePlumb on 2026-04-12. Cost $215, contractor on-site within 45min, tenant rated 5★."`
- 3 owner preferences (`text`, `tags: ["preference", "owner"]`, `metadata: { propertyId, ownerId }`). Example: `"Owner Marcus Webb (415 Mission portfolio) prefers insured contractors only, no work after 7pm, accepts callbacks via SMS."`

### 6.4 Idempotency + failure isolation

- A module-level `let seeded = false` guards re-entry.
- Each seed call (`moss.indexContractor`, `moss.indexKnowledge`, `supermemory.remember`) is wrapped in its own try/catch logged via `console.warn`. Partial seeding is fine — demo still functions.
- If Moss `init()` throws, the seeding routine logs and continues to Supermemory. Orchestrator-side Moss calls will still throw, but that's caught at the call site.

## 7. Orchestrator changes — `lib/orchestrator/run.ts`

### 7.1 Step 5 (recall context) — replace the dangling `recall()` call

Build the parallel call, shape the `RecallContext`, append a `context_recalled` event:

```ts
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
  data: {
    pastJobIds: ctx.pastJobs.map(j => j.id),
    contractorIds: ctx.contractorHits.map(c => c.contractorId),
    knowledgeIds: ctx.knowledgeHits.map(k => k.id),
  },
});
```

`buildRecallContext` is a new top-level function in `run.ts` (private to the module) that runs the three retrievals in parallel and never throws — each retrieval is independently try/catch'd and returns `[]` on failure.

### 7.2 Step 6 — `findContractorsForJob` consumes Moss hits

Function signature gains an optional `mossHits` param:

```ts
export async function findContractorsForJob(input: {
  jobId: string;
  trade: Trade;
  city: string;
  mossHits?: { contractorId: string; score: number }[];
}): Promise<FindContractorsResult>
```

Logic:
1. If `mossHits.length >= 3`, take them, sort by score, return their IDs (no Browser Use call).
2. Else, call `browseruse.findContractors()` to fill the deficit, merge unique by phone via the existing dedup path, take top-5 by rating.
3. Append the same `contractor_search_completed` event so the timeline UI doesn't change.

The route handler `app/api/contractors/find/route.ts` continues to work because the new param is optional — orchestrator-driven calls pass it, manual-trigger calls don't and get the existing behavior.

### 7.3 Step 8 — Gemini script draft receives context

`gemini.draftContractorScript()` signature isn't changing in this spec (other session owns Gemini). The orchestrator passes `RecallContext` only when there's something to pass; an extension of the Gemini interface is documented as a follow-up but not blocked on it.

For this spec, the `context_recalled` event is the visible artifact. Wiring it into the script prompt is a v1.1 stretch.

### 7.4 Step 10 — `supermemory.remember` text upgrade

Same shape, richer text + better tags. No interface change.

## 8. Type additions

- `lib/types/event.ts` — extend `JobEventKind` union with `"context_recalled"`.
- `lib/types/index.ts` — already re-exports event.ts; no edit.

## 9. Dashboard surfacing

One file, one chip. `components/dashboard/job-timeline.tsx` (or wherever event rendering lives — verified at implementation time) gets a case for `"context_recalled"` that renders a single-line, expandable chip:

```
[ context recalled ] 3 prior jobs · 2 contractor matches · 1 owner pref   ⌄
```

Expanded: shows the bullet list. Monochrome, no color, follows the existing zinc-only convention from `TEAM.md`.

## 10. Env additions

`lib/env.ts` (Zod schema):

```ts
MOSS_PROJECT_ID: z.string().optional(),
MOSS_PROJECT_KEY: z.string().optional(),       // SDK auth — name matches @inferedge/moss SDK convention
MOSS_CONTRACTORS_INDEX: z.string().default("cma_contractors_v1"),
MOSS_KNOWLEDGE_INDEX: z.string().default("cma_knowledge_v1"),
```

> Var name is `MOSS_PROJECT_KEY` (not `MOSS_API_KEY`) — matches the credential pair Nicolas provided and the SDK's project-scoped auth model.

`.env.example` — appended `# Moss (semantic search runtime)` section with the four keys above.

The existing `INTEGRATION_MODE=mock` default stays. For the demo, `.env.local` flips to `INTEGRATION_MODE=live` and adds the four Moss keys plus the existing Supermemory keys.

## 11. Failure modes & guardrails

| Failure | Behavior |
| --- | --- |
| `MOSS_PROJECT_KEY` or `MOSS_PROJECT_ID` missing in live mode | Moss client throws `IntegrationError` on first call. `buildRecallContext` catches, returns `contractorHits: []`. `findContractorsForJob` falls back to Browser Use. Demo still runs. |
| `SUPERMEMORY_API_KEY` missing in live mode | Same: caught by orchestrator try/catch around recall/remember. Non-fatal. |
| Moss init fails on cold start | Init promise rejects, all subsequent `moss.*` calls reject from the cached rejection. Demo degrades to Browser Use-only + no knowledge hits. |
| Supermemory 5xx mid-call | `IntegrationError` thrown, caught upstream, `pastJobs: []`. Surfaces as a `Recalled 0 prior jobs` chip — judges see the agent tried. |
| Seed runs twice | `seeded` flag short-circuits second call. Moss indexes use stable IDs so re-indexing is a no-op. |
| Concurrent first request | `Promise<void>` init guard ensures one init. |

## 12. Observability

- Add a `console.log` at start of every retrieval call with elapsed ms — Moss should be <50ms (loose threshold over the claimed <10ms; real-world SDK + network overhead).
- `context_recalled` event in the dashboard timeline is the user-facing observability.
- No metrics infra added in this spec.

## 13. Files touched

```
NEW   lib/integrations/moss/index.ts
NEW   lib/integrations/moss/mock.ts
NEW   lib/integrations/moss/live.ts
NEW   lib/store/seed-retrieval.ts
NEW   tests/integrations/moss.test.ts            (contract test mirroring existing pattern)
EDIT  lib/integrations/supermemory/live.ts       (wire real API, Zod-validated)
EDIT  lib/orchestrator/run.ts                    (buildRecallContext + Moss-first sourcing + event emit)
EDIT  lib/env.ts                                 (Moss keys appended — coordinate with concurrent edit)
EDIT  .env.example                               (Moss section)
EDIT  app/layout.tsx                             (seedRetrievalOnce() after seedOnce())
EDIT  lib/types/event.ts                         (add "context_recalled")
EDIT  components/dashboard/job-timeline.tsx      (render context_recalled chip — verify path at impl time)
EDIT  package.json                               (pnpm add @inferedge/moss)
```

## 14. Coordination with the parallel session

The other Claude session is working the phone-call agent capabilities. Touch points:

- **`lib/env.ts`** — they already added `AGENTPHONE_AGENT_ID` (visible in current file). I'll append Moss vars to the same Zod object without removing theirs.
- **`lib/integrations/gemini/index.ts`** — owned by them. I will *not* edit Gemini's interface. If they change `draftContractorScript` to accept context, my orchestrator code will pick that up; if not, the `context_recalled` event still works standalone.
- **`lib/orchestrator/run.ts`** — both sessions write here. My edits are localized to steps 5, 6, 8 (params only), and 10. Conflicts resolved by merging — no overlap with their call-handling changes which are in steps 1, 2, 7.

If a merge conflict arises, my changes are isolated enough that they can be reapplied from this spec.

## 15. Out of scope (future)

- Moss-backed full Supermemory replacement (would change the retrieval contract — different project).
- Multi-tenant Moss project per property-management company.
- Survey-driven re-ranking of Moss contractor hits using Supermemory satisfaction scores.
- Eviction / TTL on Moss knowledge index.
- Embedding model choice / tuning — using SDK defaults.

## 16. Acceptance criteria

A demo run against a seeded property must:

1. Show a `context recalled` chip in the job timeline within 100ms of the call landing (Moss + Supermemory in parallel; the slower limb is Supermemory network).
2. Skip Browser Use when ≥3 Moss contractor hits exist for the trade/city — verifiable in dev console / timeline.
3. After a successful job assignment, the assigned contractor's name + outcome must round-trip through Supermemory (a follow-up `recall` for the same address returns the new memory).
4. With `INTEGRATION_MODE=live` and a single missing key (Moss *or* Supermemory), the demo still completes — degraded but visible.
5. `pnpm test` stays green (mocks must satisfy the contract test).

---

## Next step

Hand this spec to `superpowers:writing-plans` to produce an implementation plan with task breakdown, dependency order, and test plan.
