# TODOs

## Tenant Survey → Supermemory Loop

### TODO: Restricted tenant-facing job endpoint
**What:** Create `GET /api/survey-info/[jobId]` returning only `{ title: string, alreadySubmitted: boolean }`.

**Why:** `GET /api/jobs/[id]` returns full PM-internal data (job events, contractor names, costs, dial outcomes) to unauthenticated tenants who click the survey link. This is a data leak for any real user.

**How to apply:** Replace the `GET /api/jobs/[id]` call in `app/survey/[jobId]/page.tsx` with the new restricted endpoint. The restricted endpoint reads only `job.title` and `job.satisfactionScore !== undefined`. No auth required on the new route.

**Depends on:** Survey page implementation.

---

### TODO: Implement live Supermemory client
**What:** Wire the real Supermemory REST API in `lib/integrations/supermemory/live.ts`.

**Why:** `live.ts` currently throws `IntegrationError` for both `recall()` and `remember()`. Any run with `SUPERMEMORY_API_KEY` set crashes the feature. Mock mode works fine for the hackathon demo, but live mode requires this.

**Per live.ts comments:**
- Base URL: `https://api.supermemory.ai`
- Auth: `Authorization: Bearer ${SUPERMEMORY_API_KEY}`
- Header: `x-project-id: ${SUPERMEMORY_PROJECT_ID}`
- `POST /v1/memories` → `remember()`
- `POST /v1/search` → `recall()` (body `{ query, topK }`)
- Return shape for recall must include `metadata` field (extended per D1 fix)
- Validate all responses with Zod before returning

**Depends on:** `SUPERMEMORY_API_KEY`, `SUPERMEMORY_PROJECT_ID` env vars. Must also implement the extended recall return type (metadata field) agreed in D1.
