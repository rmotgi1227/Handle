# Call My Agent — v1 Starter Implementation Plan

> **For agentic workers:** Each subagent owns one section below. Stay inside your file scope — do NOT touch files owned by another subagent. Shared contracts in `lib/types/`, `lib/integrations/adapter.ts`, `lib/store/memory.ts`, and `lib/env.ts` are already written — read them, don't modify them.

**Goal:** Ship a polished v1 starter for the YC "Call My Agent" hackathon so the team can iterate on a working spine: PM dashboard + sponsor-integration adapter layer + working API surface.

**Architecture:**
- Next.js 16 (App Router, Promise-based `params`), React 19, TS strict, Tailwind v4, shadcn/ui (Radix + Nova preset, Lucide icons, Geist font).
- Dashboard is for **property managers / homeowners / landlords only**. Tenants only ever interact via AgentPhone — they never see UI.
- Single Next.js app: server components for data fetching, route handlers for orchestration, in-memory store as v1 persistence.
- Each sponsor integration lives in `lib/integrations/<vendor>/` with `mock.ts` (always works, demo-grade fake data), `live.ts` (real API), and `index.ts` (picks via `INTEGRATION_MODE` env, optionally per-vendor override).

**Tech stack:** Next 16, React 19, TypeScript 5 strict, Tailwind v4, shadcn/ui radix-nova, Zod 4, nanoid 5, Vitest 4, Lucide icons.

**Prize coverage map (do not break these):**
- AgentPhone → `lib/integrations/agentphone/`, webhook at `/api/calls/incoming`
- Gemini → `lib/integrations/gemini/`, orchestrator at `/api/agent/run`
- Supermemory → `lib/integrations/supermemory/`, used by orchestrator for context
- Browser Use → `lib/integrations/browseruse/`, called by `/api/contractors/find`
- Sponge → `lib/integrations/sponge/`, called by `/api/payments/invoice`
- AgentMail → `lib/integrations/agentmail/`, called by `/api/email/notify` and `/api/survey/[jobId]`

---

## Frictionless principles (apply everywhere)

1. **Zero forms on the happy path.** PM lands on dashboard → sees active jobs ranked by urgency → one click into a job → all context already there.
2. **Auto-everything that's safe.** Triage, contractor search, dialing, scheduling, invoicing — all run automatically. PM only intervenes on flagged exceptions.
3. **Glanceable.** Status, urgency, contractor name, ETA visible on the list view without clicking.
4. **No empty states.** Seed data is loaded — every screen has something to render on first load.
5. **Real-time feel.** Poll API routes every 5s on dashboard surfaces (acceptable for v1; SSE/websockets is a v2 chore).

---

## Subagent A — Integration Adapters

**Owner files (create ALL of these, do NOT touch anything else):**
- `lib/integrations/agentphone/index.ts`
- `lib/integrations/agentphone/mock.ts`
- `lib/integrations/agentphone/live.ts`
- `lib/integrations/gemini/index.ts`
- `lib/integrations/gemini/mock.ts`
- `lib/integrations/gemini/live.ts`
- `lib/integrations/supermemory/index.ts`
- `lib/integrations/supermemory/mock.ts`
- `lib/integrations/supermemory/live.ts`
- `lib/integrations/browseruse/index.ts`
- `lib/integrations/browseruse/mock.ts`
- `lib/integrations/browseruse/live.ts`
- `lib/integrations/sponge/index.ts`
- `lib/integrations/sponge/mock.ts`
- `lib/integrations/sponge/live.ts`
- `lib/integrations/agentmail/index.ts`
- `lib/integrations/agentmail/mock.ts`
- `lib/integrations/agentmail/live.ts`
- `tests/integrations/adapters.test.ts`

**Pattern (use this exact shape for every vendor):**

```ts
// lib/integrations/<vendor>/index.ts
import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface VendorClient {
  // ... method signatures (see per-vendor spec below)
}

export const vendor: VendorClient = pickImpl<VendorClient>("vendor", {
  mock: mock.vendor,
  live: live.vendor,
} satisfies AdapterModule<VendorClient>);
```

**Per-vendor contracts (you must implement BOTH mock and live):**

### AgentPhone
```ts
export interface AgentPhoneClient {
  // Parse the incoming webhook payload from AgentPhone into a normalized Call.
  parseInboundWebhook(req: Request): Promise<{
    callId: string;
    fromNumber: string;
    startedAt: string;
  }>;
  // Stream / fetch transcript lines as they arrive.
  fetchTranscript(callId: string): Promise<{ at: string; speaker: "caller" | "agent"; text: string }[]>;
  // Place an outbound call (used to dial contractors).
  placeOutboundCall(input: {
    toNumber: string;
    fromNumber?: string;
    script: string;
    metadata?: Record<string, string>;
  }): Promise<{ callId: string }>;
}
```
- Mock: returns deterministic IDs, generates plausible transcript lines, and resolves outbound calls after a 100ms delay.
- Live: TODO comments pointing at https://docs.agentphone.dev (substitute real URL once teammates have it); throw `IntegrationError` with "AGENTPHONE_API_KEY missing" when called without the key.

### Gemini
```ts
export interface GeminiClient {
  classifyIntent(input: { transcript: string }): Promise<{
    intent: string;
    trade: import("@/lib/types").Trade;
    urgency: import("@/lib/types").JobUrgency;
    title: string;
    description: string;
    confidence: number;
  }>;
  draftContractorScript(input: {
    jobTitle: string;
    jobDescription: string;
    propertyAddress: string;
    urgency: string;
  }): Promise<{ script: string }>;
  summarizeJob(input: { events: { kind: string; title: string; at: string }[] }): Promise<{ summary: string }>;
}
```
- Mock: heuristic keyword matching on transcript ("leak" → plumbing, "no power" → electrical, "lockout" → locksmith, "ac" → hvac, default → general). Deterministic.
- Live: use `@google/generative-ai` SDK — add it to deps via `pnpm add @google/generative-ai`. Use `env.GEMINI_MODEL`. JSON-mode response with Zod validation.

### Supermemory
```ts
export interface SupermemoryClient {
  recall(input: { query: string; topK?: number }): Promise<{ memories: { id: string; text: string; score: number }[] }>;
  remember(input: { text: string; tags?: string[]; metadata?: Record<string, unknown> }): Promise<{ id: string }>;
}
```
- Mock: in-process Map keyed by tag, returns the 3 most recent matching items.
- Live: call `https://api.supermemory.ai` (per their docs); pass `SUPERMEMORY_PROJECT_ID` as a header.

### Browser Use
```ts
export interface BrowserUseClient {
  findContractors(input: {
    trade: import("@/lib/types").Trade;
    city: string;
    near?: string;
    limit?: number;
  }): Promise<{ candidates: { name: string; phone: string; rating?: number; url?: string }[] }>;
}
```
- Mock: returns 3-5 plausible local businesses for the trade (use a static fixture by trade).
- Live: POST to `BROWSERUSE_BASE_URL` with a task description; parse the result. TODO comment with the real endpoint once teammates wire it.

### Sponge
```ts
export interface SpongeClient {
  createInvoice(input: {
    contractorId: string;
    contractorEmail?: string;
    payerEmail: string;
    amountCents: number;
    memo: string;
  }): Promise<{ invoiceId: string; payUrl: string }>;
  getInvoice(invoiceId: string): Promise<{ status: "draft" | "sent" | "paid" | "failed"; paidAt?: string }>;
}
```
- Mock: returns `https://demo.sponge.test/pay/<invoiceId>`; second call to `getInvoice` returns `paid`.
- Live: TODO comment pending Sponge API docs from teammates.

### AgentMail
```ts
export interface AgentMailClient {
  sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    tags?: string[];
  }): Promise<{ messageId: string }>;
}
```
- Mock: appends to `console.log` + returns a fake messageId.
- Live: POST to AgentMail's REST endpoint using `AGENTMAIL_INBOX` as the sender.

**Tests (`tests/integrations/adapters.test.ts`):**
For each vendor in mock mode, write one Vitest test that:
1. Imports the public client from `index.ts`.
2. Calls every method with realistic input.
3. Asserts the return shape (not the values — just the keys + types).

Example:
```ts
import { describe, it, expect } from "vitest";
import { gemini } from "@/lib/integrations/gemini";

describe("gemini mock", () => {
  it("classifyIntent returns required shape", async () => {
    const out = await gemini.classifyIntent({ transcript: "There's water under my sink." });
    expect(out).toMatchObject({
      intent: expect.any(String),
      trade: expect.any(String),
      urgency: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      confidence: expect.any(Number),
    });
  });
});
```

Run `pnpm test` and confirm all pass before reporting done.

**Do NOT commit.** The orchestrator commits centrally after all parallel subagents return.

---

## Subagent B — API Routes & Orchestrator

**Owner files (create ALL of these, do NOT touch anything else):**
- `lib/orchestrator/run.ts` — main agent loop function
- `app/api/calls/incoming/route.ts`
- `app/api/agent/run/route.ts`
- `app/api/contractors/find/route.ts`
- `app/api/contractors/dial/route.ts`
- `app/api/payments/invoice/route.ts`
- `app/api/survey/[jobId]/route.ts`
- `app/api/jobs/route.ts` — GET list, used by dashboard
- `app/api/jobs/[id]/route.ts` — GET single job + events
- `app/api/calls/route.ts` — GET recent calls

**Key contracts:**
- All routes use Next 16 conventions: route handlers in `route.ts`, async `params: Promise<{...}>`, return `Response.json(...)`.
- Read/write through `import { store } from "@/lib/store/memory"`.
- For each job state transition, ALSO append a `JobEvent` via `store.appendEvent({...})` so the timeline component has data.

**`/api/calls/incoming` (POST):**
1. `agentphone.parseInboundWebhook(req)` → normalized call
2. Lookup person + property by `fromNumber` (mock by checking seed data first)
3. Create a `Call` in store with `status: "in_progress"`
4. Append `JobEvent { kind: "call_received" }`
5. Return `{ callId }`

**`/api/agent/run` (POST `{ callId }`):**
The orchestrator. Implements the main loop the whiteboard describes:
1. Fetch the Call from store. Pull transcript.
2. `gemini.classifyIntent({ transcript })` → trade + urgency + title
3. Append `intent_classified` event.
4. `supermemory.recall({ query: "<address> + <trade>" })` — fetch property history (mock returns empty for new properties).
5. Create or update Job, link to call.
6. POST to `/api/contractors/find` internally with `trade + city` → up to 5 candidates.
7. For top 3 candidates, POST to `/api/contractors/dial` in parallel (use `Promise.all`).
8. First candidate to return `accepted_job` wins — assign to job, update status to `scheduled`.
9. Append all relevant events.
10. `supermemory.remember({ text: "Job <id> assigned to <contractor> for <property>", tags: ["job", trade] })`.
11. Return `{ jobId, contractorId }`.

**`/api/contractors/find` (POST `{ jobId, trade, city }`):**
1. `browseruse.findContractors({ trade, city, limit: 5 })`
2. Merge with `store.listContractors()` (de-dup by phone).
3. Upsert any new ones with `source: "browser_use"`.
4. Append `contractor_search_completed` event.
5. Return `{ contractorIds: string[] }`.

**`/api/contractors/dial` (POST `{ jobId, contractorId }`):**
1. Load contractor + job.
2. `gemini.draftContractorScript({ jobTitle, jobDescription, propertyAddress, urgency })` → script
3. `agentphone.placeOutboundCall({ toNumber: contractor.phone, script })` → callId
4. Append `contractor_dial_started`.
5. **Simulate outcome in mock mode**: ~70% accept, 20% callback_scheduled, 10% no_answer. (Use deterministic seeded RNG based on `contractorId` so the demo is reproducible.)
6. Append `contractor_dial_outcome` with outcome + (if accepted) ETA.
7. Return `{ outcome, contractorCallId, etaWindow? }`.

**`/api/payments/invoice` (POST `{ jobId, amountCents }`):**
1. Load job + contractor.
2. `sponge.createInvoice(...)`
3. Append `invoice_sent` event with `data: { payUrl }`.
4. `agentmail.sendEmail({ to: property.ownerEmail, subject: "Invoice for <jobTitle>", text: "Pay here: <payUrl>" })`.
5. Update job status to `awaiting_payment`.
6. Return `{ invoiceId, payUrl }`.

**`/api/survey/[jobId]` (POST `{ score, feedback }`):**
1. Update job with `satisfactionScore` + `satisfactionFeedback`, status → `completed`.
2. Append `survey_completed` event.
3. Return updated job.

**`/api/jobs` (GET):**
Return `{ jobs: store.listJobs() }`.

**`/api/jobs/[id]` (GET):**
Return `{ job, events: store.listJobEvents(id) }`. 404 if not found.

**`/api/calls` (GET):**
Return `{ calls: store.listCalls().slice(0, 20) }`.

**Verification:**
After implementing, run `pnpm dev` in the background and exercise the orchestrator:
```bash
curl -X POST http://localhost:3000/api/calls/incoming -H 'content-type: application/json' -d '{"mock":true,"fromNumber":"+14155551410","transcript":"My kitchen sink is leaking"}'
# Then take the returned callId and run:
curl -X POST http://localhost:3000/api/agent/run -H 'content-type: application/json' -d '{"callId":"<id>"}'
# Should return { jobId, contractorId } and the job should appear in /api/jobs
```

**Do NOT commit.** The orchestrator commits centrally after all parallel subagents return.

---

## Subagent C — Dashboard UI

**Owner files (create ALL of these, do NOT touch anything else):**
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx` — overview
- `app/dashboard/jobs/[id]/page.tsx` — job detail
- `app/dashboard/contractors/page.tsx` — contractor pool
- `app/dashboard/settings/page.tsx` — integration toggles + property list
- `components/nav/pm-sidebar.tsx`
- `components/dashboard/live-call-card.tsx`
- `components/dashboard/job-list.tsx`
- `components/dashboard/job-timeline.tsx`
- `components/dashboard/contractor-card.tsx`
- `components/dashboard/stat-tile.tsx`
- `components/dashboard/urgency-pill.tsx`
- `components/dashboard/status-pill.tsx`
- `hooks/use-polling-fetch.ts`

**Layout (`app/dashboard/layout.tsx`):**
- Two-column shell: left sidebar (180px), main content fills the rest.
- Sidebar: logo at top, nav items (Overview, Jobs, Contractors, Settings), Lucide icons, active state via `usePathname` (client component).
- Top of main: header bar with property selector (defaults to "All properties"), live call indicator (red pulsing dot if any call has status `in_progress`).
- Background: `bg-zinc-50 dark:bg-zinc-950`.

**Overview (`app/dashboard/page.tsx`):**
- 4 stat tiles across the top: Active jobs / Live calls / Avg response time / Satisfaction score.
- "Active jobs" section: cards sorted by urgency desc, then createdAt desc. Each card shows trade icon, title, property address, urgency pill, status pill, assigned contractor name (or "Sourcing…" with a small spinner), age ("12 min ago").
- "Recent calls" rail to the right or below: last 5 calls with summary + jump-to-job link.
- Use `use-polling-fetch.ts` against `/api/jobs` and `/api/calls` with 5s interval.

**Job detail (`app/dashboard/jobs/[id]/page.tsx`):**
- Async server component, `params: Promise<{ id: string }>`.
- Top: title, urgency + status pills, "Property: 342 Valencia · Unit 3B", reporter name + phone.
- Two-column body: left = timeline (vertical, latest at top), right = contractor card (if assigned) + call transcript accordion + actions panel (Mark complete, Send invoice, Send survey, Add note — buttons that POST to the relevant routes).

**Contractors (`app/dashboard/contractors/page.tsx`):**
- Grid of contractor cards: name, trades (badges), rating, phone, source.
- "Find more" button at top opens dialog — text input for trade, city → POSTs to `/api/contractors/find`.

**Settings (`app/dashboard/settings/page.tsx`):**
- Two tabs: Integrations and Properties.
- Integrations tab: list each vendor with current mode (`mock` / `live`), env var presence indicators (green check / gray dash). No mutation here — read-only signal that env is wired.
- Properties tab: table of properties with managed_by + active_jobs count.

**`use-polling-fetch.ts`:**
```ts
"use client";
import { useEffect, useState } from "react";

export function usePollingFetch<T>(url: string, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as T;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    }
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, error };
}
```

**Visual standard — STRICT MONOCHROME (black, white, zinc only):**
- No color accents. No amber, no red, no green, no blue. Only `black`, `white`, and the `zinc` scale.
- Cards: `rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm`.
- Urgency pill (use weight + fill, not hue):
  - `emergency` → `bg-black text-white` + small filled dot
  - `urgent` → `bg-zinc-900 text-white` + ring
  - `standard` → `bg-zinc-100 text-zinc-900 border border-zinc-200`
  - `scheduled` → `bg-transparent text-zinc-500 border border-dashed border-zinc-300`
- Status pill: `bg-zinc-100 text-zinc-700` with a leading dot whose treatment shows state:
  - in-flight → solid black dot with a `motion-safe:animate-pulse`
  - done → solid black dot, no pulse
  - cancelled → outline-only dot (`border border-zinc-400 bg-transparent`)
  - failed → solid black dot with `motion-safe:animate-pulse` + `text-zinc-900` and a small `X` Lucide icon
- Live-call indicator: small black dot with `animate-pulse` (no red).
- Typography: Geist. Headings `tracking-tight`. Body `text-sm leading-snug` for tables/cards.
- Use Lucide icons in `text-zinc-700 dark:text-zinc-300` only — no colored variants.
- No emojis anywhere in UI.

**Verification:**
- `pnpm dev`, navigate to /dashboard. Confirm both seeded jobs render with correct urgency colors and a working sidebar.
- Click "job_seed_active" — timeline shows all seeded events in order with relative timestamps.

**Do NOT commit.** The orchestrator commits centrally after all parallel subagents return.

---

## Subagent D — Landing Page

**Owner files (create ALL of these, do NOT touch anything else):**
- `app/page.tsx` (REPLACE the create-next-app default)
- `components/landing/hero.tsx`
- `components/landing/how-it-works.tsx`
- `components/landing/cta-strip.tsx`
- `app/layout.tsx` (REPLACE — minimal change: keep Geist fonts, set proper metadata "Call My Agent · property maintenance on autopilot", drop the default zinc-50 wrapper since landing/dashboard set their own backgrounds, call `seedOnce()` at top of RootLayout)

**Landing brief:**
- Hero: H1 "Property maintenance, on autopilot." Sub: "Your tenants call one number. An AI agent triages, dials contractors in parallel, books the job, and pays them out — all before you've checked Slack." Two CTAs: "Open dashboard" (link to `/dashboard`) and "See how it works" (anchor).
- How it works: 4 step cards in a row (Tenant calls → Agent triages → Contractors dialed in parallel → Invoiced & paid).
- CTA strip at the bottom: "Built for the YC Call My Agent Hackathon · May 17 2026" with a small "Open dashboard →" link.
- No 21st dev MCP needed for v1 — use shadcn primitives + carefully composed Tailwind. (21st dev components can be retrofitted by teammates if time allows.)

**Visual standard — STRICT MONOCHROME (black, white, zinc only):**
- No accent colors. Black-on-white default with subtle zinc tints for surfaces. Dark mode: white-on-black with subtle zinc-900 surfaces.
- CTAs are solid black on white background (or solid white on black for the dark hero variant if used). Secondary buttons are `border border-zinc-300 bg-white text-black hover:bg-zinc-50`.
- Hero: centered, `font-semibold tracking-tight text-5xl md:text-6xl`, `max-w-3xl`.
- No gradients. No drop shadows beyond `shadow-sm` on cards. The look is Linear / Vercel / Stripe Atlas — confident, quiet, monochrome.
- The 4 step cards in "How it works" are pure `border border-zinc-200 rounded-xl p-6` — number badges are `bg-black text-white` round chips, no other color.

**Edit `app/layout.tsx`:**
Set metadata properly, ensure `seedOnce()` runs:
```tsx
import { seedOnce } from "@/lib/store/seed";
seedOnce();
```
Keep Geist Sans + Mono. Remove the `bg-zinc-50` / flex wrapper from `<body>` so each route owns its layout.

**Verification:**
- `pnpm dev`, visit `/`. Confirm hero, 4 steps, CTA strip render cleanly at 1440px and 375px widths.
- Clicking "Open dashboard" lands on `/dashboard`.

**Do NOT commit.** The orchestrator commits centrally after all parallel subagents return.

---

## Sequencing

Subagents A, B, C, D can run in parallel — their file scopes do not overlap. A and B both produce code that C consumes, but C has the API contracts above and can build against them with seed data even if A/B haven't returned yet.

After all 4 return: orchestrator (me) runs `pnpm test` + `pnpm build`, fires off a code-reviewer subagent, addresses findings, then writes the README + TEAM.md.
