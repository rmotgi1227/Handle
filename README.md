# Call My Agent

Property maintenance, on autopilot.

A tenant calls one number. An AI agent triages the issue, dials contractors in parallel until one accepts, books the job, invoices the owner, and runs a satisfaction survey — all before the property manager has checked Slack.

Built for the YC **Call My Agent** Hackathon (May 17, 2026).

## What's in this starter

A working v1 spine your team can extend:

- **PM dashboard** — owner / landlord / property-manager view of every active job, contractor, and call.
- **Adapter layer** — typed mock + live stubs for every sponsor (AgentPhone, Gemini, Supermemory, Browser Use, Sponge, AgentMail). Mock mode runs the entire demo end-to-end without a single live key.
- **Orchestrator** — `/api/agent/run` ingests a call and drives the full loop: classify → recall context → source contractors → dial in parallel → assign → schedule → invoice.
- **In-memory store** — single source of truth for the dashboard. Survives within a server process. Swap for Supermemory / Postgres in v2.

Tenants never see this UI. They only interact via the phone number.

## Run it

```bash
pnpm install
cp .env.example .env.local       # leave keys blank to stay in mock mode
pnpm dev
```

Open http://localhost:3000 for the landing page, or http://localhost:3000/dashboard for the PM surface.

Demo data is seeded automatically on first request — you'll see one active leak job and one completed lockout.

## Trigger the orchestrator manually

```bash
# 1. Simulate an inbound call
curl -X POST http://localhost:3000/api/calls/incoming \
  -H 'content-type: application/json' \
  -d '{"fromNumber":"+14155551410","transcript":"My kitchen sink is leaking again"}'
# → { callId: "call_..." }

# 2. Run the agent on that call
curl -X POST http://localhost:3000/api/agent/run \
  -H 'content-type: application/json' \
  -d '{"callId":"<callId from step 1>"}'
# → { jobId, contractorId }
```

The job will appear in `/dashboard` immediately.

## Tech stack

- Next.js 16 (App Router, Promise-based `params`)
- React 19
- TypeScript 5, strict
- Tailwind v4 + shadcn/ui (Radix · Nova preset, Lucide icons, Geist font)
- Zod 4 for boundary validation
- Vitest 4 for adapter contract tests

## Project layout

```
app/
├── page.tsx                          Landing
├── layout.tsx                        Root layout + seed
├── dashboard/                        Property-manager surface (gated by role in v2)
└── api/                              Route handlers
    ├── calls/incoming/route.ts       AgentPhone webhook
    ├── agent/run/route.ts            Gemini orchestrator entrypoint
    ├── contractors/{find,dial}/      Browser Use + parallel dialing
    ├── payments/invoice/route.ts     Sponge
    ├── survey/[jobId]/route.ts       Satisfaction
    └── jobs/, calls/                 Dashboard read APIs
components/
├── ui/                               shadcn primitives
├── dashboard/                        PM-only components
├── landing/                          Marketing surface
└── nav/
lib/
├── env.ts                            Typed env (Zod)
├── types/                            Shared domain types
├── integrations/<vendor>/            Adapter pattern: index|mock|live
├── orchestrator/run.ts               Main agent loop
└── store/                            In-memory persistence (v1)
docs/superpowers/plans/               The v1 implementation plan
tests/integrations/                   Adapter contract tests
```

## Integration status (production)

| Integration | Mode | What runs live |
|---|---|---|
| AgentPhone | live | inbound triage (+15673671109), outbound contractor dial, SMS surveys |
| Gemini | live | intent classification, contractor script drafting, visual triage |
| Supermemory | live | cross-session memory, owner prefs, past-job recall |
| Moss | live | semantic search over contractor catalog + knowledge index (dynamically imported to keep `onnxruntime-node` out of every Vercel lambda) |
| Browser Use | live | fallback contractor discovery when Moss returns < 3 hits |
| Sponge | live | USDC contractor payouts on Solana, billing wallet has live USDC on prod |
| Stripe | live | landlord invoicing + payment-succeeded webhooks |
| AgentMail | mock | invoice / receipt emails are stubs; SMS goes through AgentPhone instead |

Production is at <https://handle-yc.vercel.app>. The agent's system prompt is auto-synced with the tenant directory once per Vercel cold start (see `lib/store/bootstrap.ts`) and can be force-refreshed via `POST /api/agentphone/sync`.

## Operational notes

- **Store**: in-memory `Map` pinned on `globalThis` (`lib/store/memory.ts`). Seeded once per process via `lib/store/seed.ts`. The dashboard, API routes, and orchestrator all share the same instance. Swap for Supermemory / Postgres for multi-tenant production by replacing the `store` export — the surface is intentionally narrow.
- **Auth**: none on the dashboard yet. The product is a private PM tool — the Vercel project should be gated by a static team password before any non-demo use.
- **Failure surfacing**: the orchestrator never silently strands a job. If recall sources error → `recall_partial` event. If 0 contractors found or all dials decline → job → `needs_manual_routing` status + `routing_failed` event (red pill on the dashboard).
- **CI**: `.github/workflows/ci.yml` runs typecheck + tests on every PR.

## Next steps for the team

See [TEAM.md](./TEAM.md) for the extension guide — where to plug in real keys, how to add a new sponsor integration, and what to build next.
