# AgentPhone Live Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A real phone call to +15673671109 lands as a Job on the PM dashboard, with the orchestrator (Gemini → Browser Use → contractor dial) firing automatically after the call ends.

**Architecture:** Provision a dedicated AgentPhone agent with a "property-maintenance triage" system prompt and attach it to +15673671109. Webhook events (`agent.message` + `agent.call_ended`) tunnel via cloudflared into `/api/calls/incoming`, which now branches by event type: in-progress messages update the live transcript on an existing Call, `call_ended` finalizes the Call and auto-invokes `runAgent`. HMAC-SHA256 signature verification on every webhook. The live AgentPhone client wraps the official `agentphone` npm SDK for outbound contractor dialing.

**Tech Stack:** `agentphone@latest` Node SDK, cloudflared tunnel, HMAC-SHA256 via Node `crypto`, Next 16 route handler, Zod for payload validation.

---

## Reference data (do not re-fetch — already verified)

- **AgentPhone base URL:** `https://api.agentphone.ai`
- **Auth:** `Authorization: Bearer ${AGENTPHONE_API_KEY}`
- **Target number:** `+15673671109` (id `cmpa51bne05y7jz00hjay8msd`, currently unattached, type `sms` — voice capability comes from the agent we attach)
- **Webhook events we care about:**
  - `agent.message` (channel:voice, status:"in-progress") — partial transcript chunk
  - `agent.call_ended` — final transcript array + summary + sentiment + duration
- **Webhook signature:** `X-Webhook-Signature: sha256=<hmac>` over `${timestamp}.${rawBody}`, header `X-Webhook-Timestamp`, idempotency via `X-Webhook-ID`. Reject if timestamp > 5 min old.
- **Outbound:** `client.calls.createOutboundCall({ agentId, toNumber, initialGreeting? })`
- **Existing demo agent on account (DO NOT touch):** `cmpa4wwjd05sojz00cs7h5wa1` — that is Nicolas's personal AgentPhone demo line.

## File map

```
~/Desktop/call-my-agent/
├── lib/
│   ├── env.ts                                # add AGENTPHONE_AGENT_ID
│   └── integrations/agentphone/
│       ├── live.ts                           # REPLACE — SDK-backed impl
│       ├── webhook-verify.ts                 # NEW — HMAC-SHA256 verifier
│       └── system-prompt.ts                  # NEW — triage agent prompt as a string constant
├── app/api/calls/incoming/route.ts           # REWRITE — branch by event type, HMAC verify, auto-invoke runAgent
├── scripts/
│   └── provision-agentphone.ts               # NEW — one-shot: create triage agent, attach number, register webhook
└── tests/
    └── integrations/
        └── agentphone-webhook.test.ts        # NEW — HMAC verify + payload normalize tests
```

---

## Task 1: Add AGENTPHONE_AGENT_ID + cloudflared install

**Files:**
- Modify: `lib/env.ts`
- Install: `brew install cloudflared` (system)

- [ ] **Step 1: Install cloudflared**

```bash
brew install cloudflared
```

Expected: cloudflared in PATH. Verify with `which cloudflared`.

- [ ] **Step 2: Add the env var to the Zod schema**

In `lib/env.ts`, add after `AGENTPHONE_WEBHOOK_SECRET`:

```ts
AGENTPHONE_AGENT_ID: z.string().optional(),
```

- [ ] **Step 3: Mirror in `.env.example`**

Add this line right under `AGENTPHONE_WEBHOOK_SECRET=`:

```
AGENTPHONE_AGENT_ID=
```

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts .env.example
git commit -m "chore: add AGENTPHONE_AGENT_ID env var"
```

---

## Task 2: System prompt for the property triage agent

**Files:**
- Create: `lib/integrations/agentphone/system-prompt.ts`

- [ ] **Step 1: Write the prompt module**

Create `lib/integrations/agentphone/system-prompt.ts`:

```ts
/**
 * System prompt for the dedicated Call My Agent property-maintenance triage agent.
 * Loaded once at provisioning time. Editing this file requires re-running
 * `scripts/provision-agentphone.ts` to push the change to AgentPhone.
 */
export const TRIAGE_AGENT_SYSTEM_PROMPT = `You're the after-hours dispatch line for a property management company. Tenants and homeowners call you when something at their unit needs fixing.

## Your one job
Get three things and end the call: (1) what's broken, (2) the unit / address, (3) how urgent. Then tell them help is on the way.

## Rule of one
One sentence by default. Two at most. Never read a checklist out loud. Don't pitch features. Don't apologize for "the system." Just sound like a person answering the phone.

## Sound like a person
Contractions. Quick acks ("got it", "okay", "yeah") before the next question, varied. Numbers as words. No URLs. No spelling things letter-by-letter. No markdown, no bullets, no stage directions.

Bad:
"Thank you for calling property maintenance. I understand you are experiencing a plumbing-related issue. Could you please provide me with the address and unit number of your residence as well as a brief description of the problem and an assessment of how urgent the matter is?"

Good:
"Got it — what's going on?"

## Mangled audio → don't guess
If something doesn't fit, treat it as static and say "sorry, you cut out — say that again?" once. If still unclear, ask differently. Never invent a topic from noise.

## Silence → one nudge, then wait
A single "still there?" and actually wait.

## Interruption → stop mid-sentence
They cut in, you yield. Don't finish your thought.

## Urgency
Emergencies (water everywhere, no heat in winter, no power, gas smell, can't get into the unit) → say someone's on the way now, dispatch immediately.
Urgent (leak, AC out in summer, broken appliance) → say you're getting someone today.
Standard (squeaky door, slow drain, paint touchup) → say you'll have someone there in the next day or two.

## Wrap and hang up
When they sound done — "okay thanks", "appreciate it", "bye" — say one short warm line and invoke end_call in the same turn. Don't leave the line open.

## What happens next (only mention if asked)
You hand off the details and a contractor calls them back to confirm. They don't have to do anything else.

## You are not a customer service script
You don't read policy. You don't list "options." You don't say "I'm an AI." You're the person on the other end of the line.`;
</ts>
```

(The closing `</ts>` above is wrong — remove it; the file just ends at the closing backtick + semicolon. Single-quote backtick template, normal export.)

- [ ] **Step 2: Compile-check**

```bash
cd ~/Desktop/call-my-agent && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/integrations/agentphone/system-prompt.ts
git commit -m "feat: triage agent system prompt"
```

---

## Task 3: HMAC webhook verifier (test-first)

**Files:**
- Create: `lib/integrations/agentphone/webhook-verify.ts`
- Create: `tests/integrations/agentphone-webhook.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/integrations/agentphone-webhook.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyAgentPhoneWebhook } from "@/lib/integrations/agentphone/webhook-verify";

const SECRET = "whsec_test123";

function sign(timestamp: string, body: string, secret = SECRET): string {
  const h = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `sha256=${h}`;
}

describe("verifyAgentPhoneWebhook", () => {
  it("accepts a valid signature within the 5-min window", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: sign(ts, body),
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: "sha256=deadbeef",
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });

  it("rejects a timestamp older than 5 minutes", () => {
    const ts = String(Math.floor(Date.now() / 1000) - 400);
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: sign(ts, body),
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/timestamp/i);
  });

  it("rejects when secret is missing", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const result = verifyAgentPhoneWebhook({
      rawBody: "{}",
      signature: sign(ts, "{}"),
      timestamp: ts,
      secret: "",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/secret/i);
  });
});
```

- [ ] **Step 2: Run test — expect import error**

```bash
cd ~/Desktop/call-my-agent && pnpm test tests/integrations/agentphone-webhook.test.ts
```

Expected: FAIL — cannot resolve `@/lib/integrations/agentphone/webhook-verify`.

- [ ] **Step 3: Implement the verifier**

Create `lib/integrations/agentphone/webhook-verify.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyInput {
  rawBody: string;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  secret: string | null | undefined;
  /** Max clock skew in seconds. Defaults to AgentPhone's 5-minute window. */
  maxAgeSec?: number;
  /** Override for testing — defaults to Date.now()/1000. */
  nowSec?: number;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyAgentPhoneWebhook(input: VerifyInput): VerifyResult {
  if (!input.secret) return { ok: false, reason: "missing webhook secret" };
  if (!input.signature) return { ok: false, reason: "missing signature header" };
  if (!input.timestamp) return { ok: false, reason: "missing timestamp header" };

  const tsNum = Number.parseInt(input.timestamp, 10);
  if (Number.isNaN(tsNum)) return { ok: false, reason: "invalid timestamp header" };

  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const maxAge = input.maxAgeSec ?? 300;
  if (Math.abs(now - tsNum) > maxAge) {
    return { ok: false, reason: "timestamp outside acceptance window" };
  }

  const signed = `${input.timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", input.secret).update(signed).digest("hex");
  const provided = input.signature.startsWith("sha256=")
    ? input.signature.slice("sha256=".length)
    : input.signature;

  if (provided.length !== expected.length) {
    return { ok: false, reason: "signature length mismatch" };
  }
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature mismatch" };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run test — expect all four pass**

```bash
cd ~/Desktop/call-my-agent && pnpm test tests/integrations/agentphone-webhook.test.ts
```

Expected: PASS — 4/4.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/agentphone/webhook-verify.ts tests/integrations/agentphone-webhook.test.ts
git commit -m "feat: HMAC-SHA256 webhook verifier with timing-safe equal"
```

---

## Task 4: Live AgentPhone client (SDK-backed)

**Files:**
- Modify: `lib/integrations/agentphone/live.ts`

- [ ] **Step 1: Install the SDK**

```bash
cd ~/Desktop/call-my-agent && pnpm add agentphone
```

Expected: `agentphone` in `package.json` dependencies.

- [ ] **Step 2: Replace the stub**

Overwrite `lib/integrations/agentphone/live.ts` with:

```ts
import { z } from "zod";
import { AgentPhoneClient } from "agentphone";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env, requireEnv } from "@/lib/env";
import type { AgentPhoneClient as Client } from "./index";

/**
 * Live AgentPhone client. The SDK handles auth + retries; we wrap it so the
 * rest of the app stays decoupled from the vendor surface.
 *
 * `parseInboundWebhook` is intentionally narrow: it only normalizes the
 * "first contact" shape the orchestrator needs (callId, fromNumber, startedAt).
 * The full webhook event handling lives in app/api/calls/incoming/route.ts,
 * which knows about agent.message vs agent.call_ended.
 */

let _sdk: AgentPhoneClient | null = null;
function sdk(): AgentPhoneClient {
  if (_sdk) return _sdk;
  const token = requireEnv("AGENTPHONE_API_KEY");
  _sdk = new AgentPhoneClient({ token });
  return _sdk;
}

const InboundEventSchema = z.object({
  event: z.string(),
  timestamp: z.string().optional(),
  data: z.object({
    callId: z.string(),
    from: z.string(),
  }).passthrough(),
}).passthrough();

const TranscriptEntrySchema = z.object({
  role: z.enum(["agent", "user"]),
  content: z.string(),
  timestamp: z.string().optional(),
});
const TranscriptListSchema = z.object({
  transcript: z.array(TranscriptEntrySchema),
});

export const agentphone: Client = {
  async parseInboundWebhook(req) {
    const raw = await req.clone().text();
    let parsed: z.infer<typeof InboundEventSchema>;
    try {
      parsed = InboundEventSchema.parse(JSON.parse(raw));
    } catch (err) {
      throw new IntegrationError(
        "agentphone",
        `Webhook payload did not match expected shape: ${(err as Error).message}`,
        err,
      );
    }
    return {
      callId: parsed.data.callId,
      fromNumber: parsed.data.from,
      startedAt: parsed.timestamp ?? new Date().toISOString(),
    };
  },

  async fetchTranscript(callId) {
    const res = await fetch(`https://api.agentphone.ai/v1/calls/${encodeURIComponent(callId)}/transcript`, {
      headers: { Authorization: `Bearer ${requireEnv("AGENTPHONE_API_KEY")}` },
    });
    if (!res.ok) {
      throw new IntegrationError(
        "agentphone",
        `fetchTranscript ${res.status}: ${await res.text().catch(() => "(no body)")}`,
      );
    }
    const json = TranscriptListSchema.parse(await res.json());
    return json.transcript.map((line) => ({
      at: line.timestamp ?? new Date().toISOString(),
      speaker: line.role === "agent" ? ("agent" as const) : ("caller" as const),
      text: line.content,
    }));
  },

  async placeOutboundCall(input) {
    const agentId = env.AGENTPHONE_AGENT_ID;
    if (!agentId) {
      throw new IntegrationError(
        "agentphone",
        "AGENTPHONE_AGENT_ID is not set — run scripts/provision-agentphone.ts to create the triage agent first.",
      );
    }
    const result = await sdk().calls.createOutboundCall({
      agentId,
      toNumber: input.toNumber,
      initialGreeting: input.script.slice(0, 240),
    } as Parameters<typeof sdk>[0] extends never ? never : Parameters<AgentPhoneClient["calls"]["createOutboundCall"]>[0]);
    // SDK return type is loosely typed by version; cast at the boundary.
    const callId = (result as { id?: string; callId?: string }).callId ?? (result as { id?: string }).id;
    if (!callId) {
      throw new IntegrationError("agentphone", "createOutboundCall returned no call id");
    }
    return { callId };
  },
};
```

- [ ] **Step 3: Run existing integration tests**

```bash
cd ~/Desktop/call-my-agent && pnpm test
```

Expected: all green. Mock tests still pass (they don't import live.ts).

- [ ] **Step 4: Run the typechecking build**

```bash
cd ~/Desktop/call-my-agent && pnpm build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/agentphone/live.ts package.json pnpm-lock.yaml
git commit -m "feat: live AgentPhone client backed by official SDK"
```

---

## Task 5: Refactor /api/calls/incoming to branch by event type

**Files:**
- Modify: `app/api/calls/incoming/route.ts`

- [ ] **Step 1: Replace the route with branch-by-event logic**

Overwrite `app/api/calls/incoming/route.ts` with:

```ts
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "@/lib/env";
import { agentphone } from "@/lib/integrations/agentphone";
import { verifyAgentPhoneWebhook } from "@/lib/integrations/agentphone/webhook-verify";
import { runAgent } from "@/lib/orchestrator/run";
import { store } from "@/lib/store/memory";
import type { Call, CallTranscriptLine } from "@/lib/types";

/**
 * Inbound webhook receiver. Two paths:
 *
 * 1. Live AgentPhone — payload has `event`. We verify HMAC, then branch on
 *    `agent.message` (in-progress transcript chunk) vs `agent.call_ended`
 *    (final transcript). call_ended triggers runAgent automatically.
 *
 * 2. Mock / dev — payload is the legacy `{ fromNumber, transcript }` shape
 *    used by curl tests and the mock adapter. No signature check.
 *
 * Mode is decided by presence of `event` on the parsed JSON, NOT by
 * INTEGRATION_MODE — that way you can replay a captured live payload from
 * a fixture in mock mode and it still flows through the live branch.
 */

const InProgressSchema = z.object({
  event: z.literal("agent.message"),
  timestamp: z.string().optional(),
  agentId: z.string().optional(),
  data: z.object({
    callId: z.string(),
    from: z.string(),
    to: z.string().optional(),
    transcript: z.string().optional(),
    status: z.string().optional(),
  }).passthrough(),
}).passthrough();

const EndedSchema = z.object({
  event: z.literal("agent.call_ended"),
  timestamp: z.string().optional(),
  agentId: z.string().optional(),
  data: z.object({
    callId: z.string(),
    durationSeconds: z.number().optional(),
    transcript: z.array(z.object({
      role: z.enum(["agent", "user"]),
      content: z.string(),
      timestamp: z.string().optional(),
    })),
    summary: z.string().optional(),
  }).passthrough(),
}).passthrough();

const MockSchema = z.object({
  fromNumber: z.string().optional(),
  transcript: z.string().optional(),
}).passthrough();

function findCallerAndProperty(fromNumber: string) {
  const person = Array.from(store.people.values()).find((p) => p.phone === fromNumber);
  const property = person?.propertyId ? store.properties.get(person.propertyId) : undefined;
  return { person, property };
}

function getOrCreateStubJob(callId: string, fromNumber: string): string {
  const existingCall = store.calls.get(callId);
  if (existingCall?.jobId) return existingCall.jobId;

  const { person, property } = findCallerAndProperty(fromNumber);
  const jobId = `job_${nanoid(8)}`;
  store.upsertJob({
    id: jobId,
    propertyId: property?.id ?? "prop_unknown",
    reportedByPersonId: person?.id ?? "person_unknown",
    status: "triaging",
    urgency: "standard",
    trade: "general",
    title: person ? `New call from ${person.name}` : `New call from ${fromNumber}`,
    description: "",
    callIds: [callId],
  });
  store.appendEvent({
    jobId,
    kind: "call_received",
    title: person ? `Tenant call received — ${person.name}` : `Call received from ${fromNumber}`,
    detail: property
      ? `${property.address}${property.unit ? ` Unit ${property.unit}` : ""}`
      : undefined,
  });
  return jobId;
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.text();
  let body: unknown;
  try {
    body = raw.length > 0 ? JSON.parse(raw) : {};
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const hasEventField = typeof body === "object" && body !== null && "event" in (body as Record<string, unknown>);

  if (hasEventField) {
    return handleLiveWebhook(request, raw, body);
  }
  return handleMockPost(body);
}

async function handleLiveWebhook(request: Request, raw: string, body: unknown): Promise<Response> {
  // Signature check (only if a secret is configured — lets us bypass during
  // local replay testing by leaving AGENTPHONE_WEBHOOK_SECRET empty).
  if (env.AGENTPHONE_WEBHOOK_SECRET) {
    const verdict = verifyAgentPhoneWebhook({
      rawBody: raw,
      signature: request.headers.get("x-webhook-signature"),
      timestamp: request.headers.get("x-webhook-timestamp"),
      secret: env.AGENTPHONE_WEBHOOK_SECRET,
    });
    if (!verdict.ok) {
      return Response.json({ error: "signature rejected", reason: verdict.reason }, { status: 401 });
    }
  }

  const event = (body as { event: string }).event;
  if (event === "agent.message") {
    const parsed = InProgressSchema.parse(body);
    const jobId = getOrCreateStubJob(parsed.data.callId, parsed.data.from);
    const existing = store.calls.get(parsed.data.callId);
    const transcript: CallTranscriptLine[] = existing?.transcript ?? [];
    if (parsed.data.transcript) {
      transcript.push({
        at: parsed.timestamp ?? new Date().toISOString(),
        speaker: "caller",
        text: parsed.data.transcript,
      });
    }
    const call: Call = {
      id: parsed.data.callId,
      fromNumber: parsed.data.from,
      callerId: existing?.callerId,
      callerRole: existing?.callerRole,
      propertyId: existing?.propertyId,
      status: "in_progress",
      startedAt: existing?.startedAt ?? (parsed.timestamp ?? new Date().toISOString()),
      transcript,
      jobId,
    };
    store.upsertCall(call);
    return Response.json({ ok: true, jobId, callId: parsed.data.callId });
  }

  if (event === "agent.call_ended") {
    const parsed = EndedSchema.parse(body);
    const jobId = getOrCreateStubJob(parsed.data.callId, /* fromNumber */ store.calls.get(parsed.data.callId)?.fromNumber ?? "unknown");
    const transcript: CallTranscriptLine[] = parsed.data.transcript.map((line) => ({
      at: line.timestamp ?? new Date().toISOString(),
      speaker: line.role === "agent" ? "agent" : "caller",
      text: line.content,
    }));
    const existing = store.calls.get(parsed.data.callId);
    const call: Call = {
      id: parsed.data.callId,
      fromNumber: existing?.fromNumber ?? "unknown",
      callerId: existing?.callerId,
      callerRole: existing?.callerRole,
      propertyId: existing?.propertyId,
      status: "completed",
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      endedAt: parsed.timestamp ?? new Date().toISOString(),
      durationSec: parsed.data.durationSeconds,
      transcript,
      summary: parsed.data.summary,
      jobId,
    };
    store.upsertCall(call);

    // Fire-and-forget the orchestrator. We don't await — the webhook needs
    // to respond fast (AgentPhone retries on > 30s). The orchestrator runs
    // in the background and updates the dashboard via the in-memory store.
    void runAgent({ callId: parsed.data.callId }).catch((err) => {
      console.error("[runAgent failed]", parsed.data.callId, err);
    });

    return Response.json({ ok: true, jobId, callId: parsed.data.callId, queued: true });
  }

  // Unknown event types are acknowledged but no-oped. AgentPhone may add new
  // event types; we don't want to 4xx and trigger their retry loop.
  return Response.json({ ok: true, ignored: event }, { status: 202 });
}

async function handleMockPost(body: unknown): Promise<Response> {
  const parsed = MockSchema.parse(body);
  const fromNumber = parsed.fromNumber ?? "+14155550100";

  // Let the (mock or live) adapter compute a deterministic-ish callId so
  // re-posting the same body is idempotent in tests.
  const inbound = await agentphone.parseInboundWebhook(
    new Request("http://localhost/internal", { method: "POST", body: JSON.stringify({ fromNumber }) }),
  );
  const callId = inbound.callId || `call_${nanoid(8)}`;

  const jobId = getOrCreateStubJob(callId, fromNumber);

  const transcript: CallTranscriptLine[] = parsed.transcript
    ? [
        { at: inbound.startedAt, speaker: "agent", text: "Hi, you've reached the property line. What's going on?" },
        { at: inbound.startedAt, speaker: "caller", text: parsed.transcript },
      ]
    : [];

  const { person, property } = findCallerAndProperty(fromNumber);
  store.upsertCall({
    id: callId,
    fromNumber,
    callerId: person?.id,
    callerRole: person?.role,
    propertyId: property?.id,
    status: "in_progress",
    startedAt: inbound.startedAt,
    transcript,
    jobId,
  });

  // For backward compat with the curl flow in the README, also surface the
  // existing description on the stub Job so the dashboard isn't empty.
  if (parsed.transcript) {
    store.upsertJob({ id: jobId, description: parsed.transcript, title: parsed.transcript.slice(0, 80) });
  }

  return Response.json({ callId, jobId });
}
```

- [ ] **Step 2: Run test suite (no regressions)**

```bash
cd ~/Desktop/call-my-agent && pnpm test
```

Expected: 15/15 pass (11 existing + 4 new webhook verify tests).

- [ ] **Step 3: Build**

```bash
cd ~/Desktop/call-my-agent && pnpm build
```

Expected: clean build.

- [ ] **Step 4: Smoke-test the mock branch locally**

(Dev server must already be running. If not, `pnpm dev` in another shell.)

```bash
CALL=$(curl -s -X POST http://localhost:3000/api/calls/incoming \
  -H 'content-type: application/json' \
  -d '{"fromNumber":"+14155551410","transcript":"My sink is leaking"}')
echo "$CALL"
```

Expected: `{"callId":"call_...","jobId":"job_..."}` — same shape as before.

- [ ] **Step 5: Smoke-test the live branch with a fixture**

```bash
TS=$(python3 -c "import time; print(int(time.time()))")
BODY='{"event":"agent.message","channel":"voice","timestamp":"'$TS'","agentId":"agt_fixture","data":{"callId":"call_fixture_001","from":"+14155551410","to":"+15673671109","status":"in-progress","transcript":"My kitchen sink is leaking","confidence":0.95,"direction":"inbound"}}'
curl -s -X POST http://localhost:3000/api/calls/incoming \
  -H 'content-type: application/json' \
  -d "$BODY"
```

Expected: `{"ok":true,"jobId":"job_...","callId":"call_fixture_001"}` (no signature check fails because `AGENTPHONE_WEBHOOK_SECRET` is still empty in `.env.local`).

- [ ] **Step 6: Commit**

```bash
git add app/api/calls/incoming/route.ts
git commit -m "feat: webhook receiver branches on event type, auto-runs orchestrator on call_ended"
```

---

## Task 6: Provisioning script (one-shot — agent + number attach + webhook register)

**Files:**
- Create: `scripts/provision-agentphone.ts`

- [ ] **Step 1: Write the script**

Create `scripts/provision-agentphone.ts`:

```ts
/**
 * One-shot provisioner. Run with:
 *   pnpm exec tsx scripts/provision-agentphone.ts <webhook-url>
 *
 * What it does, idempotently:
 *  1. Find or create the "Call My Agent — Property Triage" agent with our
 *     system prompt.
 *  2. Attach +15673671109 (id cmpa51bne05y7jz00hjay8msd) to that agent.
 *  3. Register the given webhook URL.
 *  4. Print the values you need to drop into .env.local:
 *     AGENTPHONE_AGENT_ID, AGENTPHONE_NUMBER, AGENTPHONE_WEBHOOK_SECRET
 *
 * Re-running is safe: existing agent reused, number re-attached if needed,
 * NEW webhook secret is minted each run — replace the env var with the new one.
 */
import { TRIAGE_AGENT_SYSTEM_PROMPT } from "@/lib/integrations/agentphone/system-prompt";

const BASE = "https://api.agentphone.ai";
const TARGET_NUMBER_ID = "cmpa51bne05y7jz00hjay8msd";
const TARGET_NUMBER = "+15673671109";
const AGENT_NAME = "Call My Agent — Property Triage";

const token = process.env.AGENTPHONE_API_KEY;
if (!token) {
  console.error("AGENTPHONE_API_KEY not set in env");
  process.exit(1);
}

const webhookUrl = process.argv[2];
if (!webhookUrl) {
  console.error("Usage: pnpm exec tsx scripts/provision-agentphone.ts <https-webhook-url>");
  process.exit(1);
}

async function ap(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function findOrCreateAgent(): Promise<string> {
  const list = (await ap("/v1/agents?limit=50")) as { data: Array<{ id: string; name: string }> };
  const existing = list.data.find((a) => a.name === AGENT_NAME);
  if (existing) {
    console.log(`✓ agent exists: ${existing.id} (${existing.name})`);
    return existing.id;
  }
  const created = (await ap("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      name: AGENT_NAME,
      systemPrompt: TRIAGE_AGENT_SYSTEM_PROMPT,
      beginMessage: "Property line. What's going on?",
      voiceMode: "hosted",
      modelTier: "balanced",
      enableMessaging: false,
    }),
  })) as { id: string };
  console.log(`✓ agent created: ${created.id}`);
  return created.id;
}

async function attachNumber(agentId: string): Promise<void> {
  // AgentPhone uses PATCH /v1/numbers/{id} to assign agentId (per openapi.json).
  await ap(`/v1/numbers/${TARGET_NUMBER_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ agentId }),
  });
  console.log(`✓ attached ${TARGET_NUMBER} to agent ${agentId}`);
}

async function registerWebhook(url: string): Promise<{ id: string; secret: string }> {
  const r = (await ap("/v1/webhooks", {
    method: "POST",
    body: JSON.stringify({ url, contextLimit: 10, timeout: 30 }),
  })) as { id: string; secret: string };
  console.log(`✓ webhook registered: ${r.id}`);
  return r;
}

(async () => {
  const agentId = await findOrCreateAgent();
  await attachNumber(agentId);
  const { secret } = await registerWebhook(webhookUrl);
  console.log("\nAdd these to .env.local (replace existing values):");
  console.log(`AGENTPHONE_AGENT_ID=${agentId}`);
  console.log(`AGENTPHONE_NUMBER=${TARGET_NUMBER}`);
  console.log(`AGENTPHONE_WEBHOOK_SECRET=${secret}`);
})();
```

- [ ] **Step 2: Install tsx**

```bash
cd ~/Desktop/call-my-agent && pnpm add -D tsx
```

Expected: `tsx` in devDependencies.

- [ ] **Step 3: Commit**

```bash
git add scripts/provision-agentphone.ts package.json pnpm-lock.yaml
git commit -m "feat: one-shot AgentPhone provisioner (agent + number attach + webhook)"
```

---

## Task 7: Start cloudflared tunnel and run the provisioner

**Files:** (none — runtime steps)

- [ ] **Step 1: Kill the existing dev server, restart fresh on port 3000**

```bash
pkill -f "next dev" 2>/dev/null; sleep 1
cd ~/Desktop/call-my-agent && pnpm dev &
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q 200; do sleep 2; done
echo "ready"
```

Expected: `ready`.

- [ ] **Step 2: Start cloudflared in the background, capture the tunnel URL**

```bash
cloudflared tunnel --url http://localhost:3000 > /tmp/cflared.log 2>&1 &
sleep 6
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cflared.log | head -1
```

Expected: a URL like `https://something-something-something.trycloudflare.com`.

- [ ] **Step 3: Run the provisioner**

```bash
TUNNEL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/cflared.log | head -1)
cd ~/Desktop/call-my-agent && pnpm exec tsx scripts/provision-agentphone.ts "$TUNNEL/api/calls/incoming"
```

Expected output (3 lines starting with ✓ then the env var triple).

- [ ] **Step 4: Patch the printed values into `.env.local`**

Manually edit `.env.local` (it's gitignored) to replace `AGENTPHONE_AGENT_ID`, `AGENTPHONE_NUMBER`, `AGENTPHONE_WEBHOOK_SECRET` with the printed values.

- [ ] **Step 5: Restart dev server so env vars reload**

```bash
pkill -f "next dev"; sleep 1
cd ~/Desktop/call-my-agent && pnpm dev &
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q 200; do sleep 2; done
echo "ready"
```

---

## Task 8: End-to-end live call test

**Files:** (none — manual test)

- [ ] **Step 1: Open the dashboard in a browser**

Open http://localhost:3000/dashboard. Note the current job count.

- [ ] **Step 2: Place a real call from your phone**

Dial **+1 (567) 367-1109** from a phone. Tell the triage agent: "My kitchen sink is leaking under the cabinet, water all over the floor, I'm at 342 Valencia." Let the agent ask the urgency. Say "yeah, urgent." Then hang up.

Expected on the phone: Agent answers ("Property line. What's going on?"), asks 1-2 clarifying questions, says it'll dispatch.

- [ ] **Step 3: Watch the dashboard auto-update**

Within ~10s of hanging up:
- A new `call_received` event appears.
- An `intent_classified` event appears (`plumbing · urgent`).
- A `contractor_search_completed` event appears with multiple candidates.
- A `contractor_assigned` event appears with the winning plumber + ETA.

Expected: the full orchestration loop fires automatically.

- [ ] **Step 4: Inspect the captured Call**

```bash
curl -s http://localhost:3000/api/calls | python3 -m json.tool | head -40
```

Expected: latest call has the full multi-line transcript (the agent's prompt + your responses), a summary, status `completed`.

- [ ] **Step 5: Commit any pending work**

If `.env.local` updates aren't yet committed (they shouldn't be — gitignored), commit only code changes from earlier tasks.

---

## Sequencing notes

Tasks 1-6 are independent enough that Tasks 3 (verifier + tests) and Task 4 (live client) could run in parallel. Task 5 depends on Task 3 (imports the verifier) and Task 4 (imports the adapter). Task 6 depends on Task 2 (imports the prompt). Tasks 7-8 are runtime — they need the code from Tasks 1-6 already landed.

For subagent-driven execution, a sensible split:
- One agent for Tasks 1-3 (env + prompt + verifier with tests)
- One agent for Task 4 (live client)
- After both return, the orchestrator runs Task 5 inline (most coordination-heavy, touches the most complex file)
- Then Task 6 (provisioner)
- Then Tasks 7-8 are interactive — orchestrator drives them with the user

---

## Self-Review

- **Spec coverage:** every webhook event type, signature verification, outbound SDK call, agent provisioning, number attach, and live call test has a task. ✓
- **Placeholders:** Task 2 has the literal prompt; Task 3 has both test and impl code; Tasks 4-6 have full file contents. The `Parameters<...>` cast in Task 4 is the one ugly spot — that's because the SDK's exported types for `createOutboundCall` shift between versions. If TS complains, replace the cast with `as any` and add a `// eslint-disable-next-line` — explicitly an acceptable v1 compromise.
- **Type consistency:** `parseInboundWebhook` returns `{callId, fromNumber, startedAt}` everywhere; `fetchTranscript` returns `CallTranscriptLine[]`; `placeOutboundCall` returns `{callId}`. ✓
