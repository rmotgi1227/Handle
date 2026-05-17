/**
 * /api/calls/incoming — the AgentPhone webhook receiver.
 *
 * Two paths, dispatched by the presence of an `event` field on the body:
 *
 *   1) LIVE webhook (`event` is present) — AgentPhone has POSTed a real
 *      `agent.message` or `agent.call_ended` event. We HMAC-verify the raw
 *      body (when `AGENTPHONE_WEBHOOK_SECRET` is set), then route by event:
 *        - `agent.message`     → append caller line, mark `in_progress`,
 *                                respond 200 immediately.
 *        - `agent.call_ended`  → finalize transcript + summary, fire
 *                                `runAgent` as fire-and-forget so AgentPhone
 *                                isn't held past its 30s retry window.
 *        - anything else       → 202 acknowledge (don't 4xx — that retries).
 *
 *   2) MOCK / curl path (no `event`) — the README's local replay shape
 *      `{ fromNumber, transcript }`. Preserved bit-for-bit so docs keep
 *      working. Skips HMAC entirely.
 *
 * HMAC verification runs against the raw request body BEFORE any
 * JSON.parse, so signing stays byte-exact.
 */

import { after } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { env } from "@/lib/env";
import { agentphone } from "@/lib/integrations/agentphone";
import { verifyAgentPhoneWebhook } from "@/lib/integrations/agentphone/webhook-verify";
import { runAgent } from "@/lib/orchestrator/run";
import { store } from "@/lib/store/memory";
import type { Call, CallTranscriptLine } from "@/lib/types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const AgentMessageSchema = z
  .object({
    event: z.literal("agent.message"),
    timestamp: z.string().optional(),
    data: z
      .object({
        callId: z.string(),
        from: z.string(),
        status: z.string().optional(),
        transcript: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const CallEndedSchema = z
  .object({
    event: z.literal("agent.call_ended"),
    timestamp: z.string().optional(),
    data: z
      .object({
        callId: z.string(),
        durationSeconds: z.number().optional(),
        transcript: z.array(
          z.object({
            role: z.enum(["agent", "user"]),
            content: z.string(),
            timestamp: z.string().optional(),
          }),
        ),
        summary: z.string().optional(),
      })
      .passthrough(),
  })
  .passthrough();

const MockBodySchema = z
  .object({
    mock: z.boolean().optional(),
    fromNumber: z.string().optional(),
    transcript: z.string().optional(),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface StubJobResult {
  jobId: string;
  person: ReturnType<typeof findPersonByPhone>;
  property: ReturnType<typeof findPropertyForPerson>;
  unit: ReturnType<typeof findUnitForPerson>;
}

function findPersonByPhone(fromNumber: string) {
  return Array.from(store.people.values()).find((p) => p.phone === fromNumber);
}

function findPropertyForPerson(person: ReturnType<typeof findPersonByPhone>) {
  return person?.propertyId ? store.properties.get(person.propertyId) : undefined;
}

function findUnitForPerson(person: ReturnType<typeof findPersonByPhone>) {
  return person?.unitId ? store.getUnit(person.unitId) : undefined;
}

/**
 * Ensure a stub Job exists for this call. If the call already has one,
 * return it untouched — this keeps live `agent.message` + `agent.call_ended`
 * idempotent across retries. Otherwise create a fresh `triaging` job and
 * fire the `call_received` event exactly once.
 */
function getOrCreateStubJob(callId: string, fromNumber: string): StubJobResult {
  const existingCall = store.calls.get(callId);
  if (existingCall?.jobId) {
    const person = existingCall.callerId ? store.people.get(existingCall.callerId) : undefined;
    const property = existingCall.propertyId ? store.properties.get(existingCall.propertyId) : undefined;
    const unit = findUnitForPerson(person);
    return { jobId: existingCall.jobId, person, property, unit };
  }

  const person = findPersonByPhone(fromNumber);
  const property = findPropertyForPerson(person);
  const unit = findUnitForPerson(person);
  const jobId = `job_${nanoid(8)}`;

  store.upsertJob({
    id: jobId,
    propertyId: property?.id ?? "prop_unknown",
    unitId: unit?.id,
    unitLabel: unit?.label,
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
      ? `${property.address}${unit?.label ? `, Unit ${unit.label}` : property.unit ? ` Unit ${property.unit}` : ""}`
      : undefined,
  });

  return { jobId, person, property, unit };
}

// ---------------------------------------------------------------------------
// Route handler — thin dispatcher
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  let parsed: unknown;
  try {
    parsed = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const hasEvent =
    typeof parsed === "object" &&
    parsed !== null &&
    "event" in (parsed as Record<string, unknown>);

  if (hasEvent) {
    return handleLiveWebhook(request, rawBody, parsed);
  }
  return handleMockPost(request, rawBody, parsed);
}

// ---------------------------------------------------------------------------
// Live AgentPhone webhook path
// ---------------------------------------------------------------------------

async function handleLiveWebhook(
  request: Request,
  rawBody: string,
  parsed: unknown,
): Promise<Response> {
  // HMAC verification only when a secret is configured. In dev replay we
  // intentionally skip so curl/cloudflared without signing still works.
  if (env.AGENTPHONE_WEBHOOK_SECRET) {
    const result = verifyAgentPhoneWebhook({
      rawBody,
      signature: request.headers.get("x-webhook-signature"),
      timestamp: request.headers.get("x-webhook-timestamp"),
      secret: env.AGENTPHONE_WEBHOOK_SECRET,
    });
    if (!result.ok) {
      return Response.json(
        { error: "signature rejected", reason: result.reason },
        { status: 401 },
      );
    }
  }

  const eventName = (parsed as { event: unknown }).event;

  if (eventName === "agent.message") {
    const body = AgentMessageSchema.safeParse(parsed);
    if (!body.success) {
      return Response.json(
        { error: "invalid agent.message payload", detail: body.error.message },
        { status: 400 },
      );
    }
    const { callId, from, transcript } = body.data.data;
    const startedAt = body.data.timestamp ?? new Date().toISOString();
    const { jobId, person, property, unit } = getOrCreateStubJob(callId, from);

    const existing = store.calls.get(callId);
    const lines: CallTranscriptLine[] = existing ? [...existing.transcript] : [];
    // Dedupe against AgentPhone retries — identical (at, text) means the same
    // chunk was redelivered after a webhook timeout. Don't double-append.
    if (transcript) {
      const dup = lines.some((l) => l.at === startedAt && l.text === transcript);
      if (!dup) {
        lines.push({ at: startedAt, speaker: "caller", text: transcript });
      }
    }

    const call: Call = {
      id: callId,
      fromNumber: from,
      callerId: person?.id ?? existing?.callerId,
      callerRole: person?.role ?? existing?.callerRole,
      propertyId: property?.id ?? existing?.propertyId,
      unitId: unit?.id ?? existing?.unitId,
      status: "in_progress",
      startedAt: existing?.startedAt ?? startedAt,
      transcript: lines,
      jobId,
    };
    store.upsertCall(call);

    return Response.json({ ok: true, jobId, callId });
  }

  if (eventName === "agent.call_ended") {
    const body = CallEndedSchema.safeParse(parsed);
    if (!body.success) {
      return Response.json(
        { error: "invalid agent.call_ended payload", detail: body.error.message },
        { status: 400 },
      );
    }
    const { callId, durationSeconds, transcript, summary } = body.data.data;
    const endedAt = body.data.timestamp ?? new Date().toISOString();

    const existing = store.calls.get(callId);
    // Live `agent.call_ended` can arrive before any `agent.message` if the
    // call was very short — fall back to "unknown" so we still record it.
    const fromNumber = existing?.fromNumber ?? "unknown";
    const { jobId, person, property, unit } = getOrCreateStubJob(callId, fromNumber);

    // AgentPhone's call_ended transcript is the authoritative final version,
    // so it replaces any partial lines accumulated from agent.message events.
    const lines: CallTranscriptLine[] = transcript.map((entry) => ({
      at: entry.timestamp ?? endedAt,
      speaker: entry.role === "agent" ? "agent" : "caller",
      text: entry.content,
    }));

    const call: Call = {
      id: callId,
      fromNumber,
      callerId: person?.id ?? existing?.callerId,
      callerRole: person?.role ?? existing?.callerRole,
      propertyId: property?.id ?? existing?.propertyId,
      unitId: unit?.id ?? existing?.unitId,
      status: "completed",
      startedAt: existing?.startedAt ?? endedAt,
      endedAt,
      durationSec: durationSeconds,
      transcript: lines,
      summary,
      jobId,
    };
    // Idempotency: a webhook retry of call_ended must not re-dial contractors.
    // Once we've already promoted the call to "completed" and fired runAgent,
    // a second call_ended is a no-op (still 200 so AgentPhone stops retrying).
    const alreadyTriggered = existing?.status === "completed";
    store.upsertCall(call);

    if (!alreadyTriggered) {
      // Run after the response — `after()` keeps the work alive past the
      // Response resolution on serverless. Local dev keeps the process up
      // either way. AgentPhone retries any response slower than 30s, and
      // runAgent dials contractors (potentially much longer).
      after(async () => {
        try {
          await runAgent({ callId });
        } catch (err) {
          console.error(`[runAgent] failed for ${callId}:`, err);
        }
      });
    }

    return Response.json({ ok: true, jobId, callId, queued: !alreadyTriggered });
  }

  // Unknown event — ack with 202 so AgentPhone doesn't retry.
  return Response.json(
    { ok: true, ignored: eventName },
    { status: 202 },
  );
}

// ---------------------------------------------------------------------------
// Mock / curl replay path (preserves README behavior)
// ---------------------------------------------------------------------------

async function handleMockPost(
  _request: Request,
  _rawBody: string,
  parsed: unknown,
): Promise<Response> {
  const body = MockBodySchema.safeParse(parsed);
  if (!body.success) {
    return Response.json(
      { error: "Invalid mock body", detail: body.error.message },
      { status: 400 },
    );
  }

  // Mock path is for curl/dev replay only — don't dispatch through the
  // adapter (the live adapter's parseInboundWebhook expects an event-shaped
  // body, not the curl shape). Generate a callId locally.
  const fromNumber = body.data.fromNumber ?? "+14155550100";
  const callId = `call_${nanoid(8)}`;
  const startedAt = new Date().toISOString();

  const { jobId, person, property, unit } = getOrCreateStubJob(callId, fromNumber);

  // Preserve the original mock title/description override when a transcript
  // is supplied via curl. getOrCreateStubJob picks a generic title; replace
  // it here so the dashboard shows the actual reported issue.
  if (body.data.transcript) {
    store.upsertJob({
      id: jobId,
      title: body.data.transcript.slice(0, 80),
      description: body.data.transcript,
    });
  }

  const transcript: CallTranscriptLine[] = body.data.transcript
    ? [
        {
          at: startedAt,
          speaker: "agent",
          text: "Hi, you've reached the property line. What's going on?",
        },
        {
          at: startedAt,
          speaker: "caller",
          text: body.data.transcript,
        },
      ]
    : [];

  const call: Call = {
    id: callId,
    fromNumber,
    callerId: person?.id,
    callerRole: person?.role,
    propertyId: property?.id,
    unitId: unit?.id,
    status: "in_progress",
    startedAt: startedAt,
    transcript,
    jobId,
  };
  store.upsertCall(call);

  return Response.json({ callId, jobId });
}
