# Team Extension Guide

This is the v1 starter. Spine is shipped — everything below is yours to extend.

## How the adapter pattern works

Every sponsor lives in `lib/integrations/<vendor>/`:

```
agentphone/
├── index.ts    # Exports the public typed client — DO NOT modify the interface
├── mock.ts     # Deterministic stub for demos. ALWAYS WORKS, no env required.
└── live.ts     # Real API calls. Reads keys via lib/env.ts.
```

`index.ts` picks `mock` vs `live` via two env vars:

1. Global default: `INTEGRATION_MODE=mock|live`
2. Per-vendor override: `GEMINI_MODE=live`, `AGENTPHONE_MODE=live`, etc.

This means you can flip a single integration to live (e.g. Gemini, once the API key is in your `.env.local`) while keeping the rest mocked. Demo never breaks.

## To plug in a real sponsor key

1. Drop the key in `.env.local` (use `.env.example` as the template).
2. Open `lib/integrations/<vendor>/live.ts` and implement the methods. The signature comes from the interface in `index.ts` — TypeScript will tell you what's missing.
3. Flip the mode: `<VENDOR>_MODE=live` in `.env.local` (or `INTEGRATION_MODE=live` for everything).
4. Confirm: `pnpm test` — contract tests in `tests/integrations/adapters.test.ts` cover shape, not behavior, so they should still pass for live mode if your impl honors the interface.

## To add a new sponsor

1. `mkdir lib/integrations/<new-vendor>/` and add `index.ts`, `mock.ts`, `live.ts`.
2. Define the public interface in `index.ts`. Follow the existing pattern — see `lib/integrations/gemini/index.ts`.
3. Use `pickImpl()` from `lib/integrations/adapter.ts` to swap mock/live.
4. Add a contract test to `tests/integrations/adapters.test.ts`.
5. If the vendor needs env vars, add them to the Zod schema in `lib/env.ts` and to `.env.example`.

## To wire a real Supermemory backend

`lib/store/memory.ts` is the v1 in-memory map. The shape is intentionally minimal so you can swap implementations without touching the rest of the app.

Recommended v2 path:
1. Replace each `Map` with calls to Supermemory's recall/remember API (already wired in `lib/integrations/supermemory/`).
2. Keep the same method signatures (`upsertJob`, `listJobs`, `appendEvent`, …) so route handlers and components are untouched.
3. Or: use Supabase / Postgres for structured rows + Supermemory for unstructured context recall. Both work.

## Conventions

- **Monochrome only.** No color in the UI beyond black, white, and the `zinc` scale. Status is conveyed by fill, ring, dash, and motion — never hue.
- **Lucide icons only.** No emoji in UI strings.
- **Server components by default.** Use `"use client"` only for actual interactivity (polling, dialogs, click handlers, sidebar active state).
- **Zod at boundaries.** Validate every route handler input. Validate every live-mode external response.
- **No `any`.** Use `unknown` + type guards when shape is dynamic.
- **`params` is a Promise in Next 16.** Destructure with `const { id } = await params`.
- **Every job state change appends a `JobEvent`.** That's what feeds the timeline component.

## Demo flow (8 PM ship target)

1. Open `/` — landing renders cleanly.
2. Open `/dashboard` — seeded job is visible.
3. Trigger a fresh inbound call via the curl in the README. The new job appears within the 5s poll interval.
4. Click into the job — timeline shows the full orchestration sequence.
5. (Optional) `/dashboard/settings` shows which integrations are wired live vs mock.

## Open questions for the team

- **Property/owner auth.** v1 has no auth. Add Clerk or NextAuth for the dashboard before any external pilot.
- **Tenant verification.** AgentPhone currently trusts the caller ID. Real product needs property lookup + secondary verification (unit number, etc.).
- **Contractor onboarding.** v1 has a static seed pool + Browser Use discovery. Real product needs a contractor-facing flow.
- **Payment splits.** Sponge wires owner → contractor. Whether to take a platform fee, and how, is a product call.

## Where to find the original plan

`docs/superpowers/plans/2026-05-17-call-my-agent-v1.md`

Every file in this repo traces back to a section of that document. If you're adding something new, consider drafting a follow-up plan in the same directory so the next person to touch the area has a map.
