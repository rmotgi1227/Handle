/**
 * /api/calls/incoming — the AgentPhone webhook receiver.
 *
 * Three paths, dispatched by body shape:
 *
 *   1) LIVE lifecycle event (`event` present) — `agent.message` or
 *      `agent.call_ended`. HMAC-verified, updates the store, fires runAgent
 *      at call end.
 *
 *   2) VOICE TURN (`recentHistory` array present, no `event`) — AgentPhone
 *      is in webhook mode and is asking us for the next agent utterance.
 *      We call Gemini with the transcript + conversation history and return
 *      NDJSON `{ text }` for AgentPhone's TTS to speak.
 *
 *   3) MOCK / curl path (no `event`, no `recentHistory`) — local replay
 *      shape `{ fromNumber, transcript }`. Preserved for dev/docs.
 *
 * HMAC verification runs against the raw request body BEFORE any
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
import { isCallerAllowed } from "@/lib/integrations/agentphone/whitelist";
import { gemini } from "@/lib/integrations/gemini";
import { moss } from "@/lib/integrations/moss";
import { supermemory } from "@/lib/integrations/supermemory";
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

const VoiceTurnSchema = z
  .object({
    callId: z.string(),
    fromNumber: z.string().default(""),
    transcript: z.string(),
    recentHistory: z.array(
      z.object({ role: z.string(), content: z.string() }),
    ).default([]),
  })
  .passthrough();

// ---------------------------------------------------------------------------
// Voice recall cache — persists across turns for one call, cleared on end
// ---------------------------------------------------------------------------

interface VoiceRecallCache {
  knowledgeHits: string[];  // Moss diagnostic guidance snippets
  pastJobs: string[];       // Supermemory past job summaries
  ownerPrefs: string[];     // Supermemory owner preference snippets
}

const voiceRecallCache = new Map<string, VoiceRecallCache>();

// ---------------------------------------------------------------------------
// Bypass detection — checked before Gemini, triggers immediate dispatch
// ---------------------------------------------------------------------------

const BYPASS_RE =
  /\b(emergency|emergent|urgent|asap|right now|send someone|find a contractor|get a contractor|just dispatch|dispatch now|skip (the )?questions?|forget (the )?questions?|stop asking|just fix|just get|bypass)\b/i;

function isBypassIntent(transcript: string): boolean {
  return BYPASS_RE.test(transcript);
}

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

  // Voice turn: AgentPhone webhook mode sends { callId, fromNumber, transcript, recentHistory }
  // with no `event` field. Detect by presence of recentHistory array.
  const body = parsed as Record<string, unknown>;
  const isVoiceTurn = Array.isArray(body?.recentHistory);
  if (isVoiceTurn) {
    return handleVoiceTurn(parsed);
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
    if (!isCallerAllowed(from)) {
      return Response.json(
        { ok: true, ignored: true, reason: "caller_not_allowed", from },
        { status: 200 },
      );
    }
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
    // If we never saw an agent.message for this call, the whitelist hasn't
    // been checked yet — drop unrecognized callers here too.
    if (!existing && !isCallerAllowed(fromNumber)) {
      return Response.json(
        { ok: true, ignored: true, reason: "caller_not_allowed", from: fromNumber },
        { status: 200 },
      );
    }
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
    voiceRecallCache.delete(callId); // free memory, call is done

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
  if (!isCallerAllowed(fromNumber)) {
    return Response.json(
      { ok: false, error: "caller_not_allowed", from: fromNumber },
      { status: 403 },
    );
  }
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

// ---------------------------------------------------------------------------
// Voice turn path — AgentPhone webhook mode
// ---------------------------------------------------------------------------

async function handleVoiceTurn(parsed: unknown): Promise<Response> {
  const body = VoiceTurnSchema.safeParse(parsed);
  if (!body.success) {
    return Response.json(
      { error: "invalid voice turn payload", detail: body.error.message },
      { status: 400 },
    );
  }

  const { callId, fromNumber, transcript, recentHistory } = body.data;

  if (fromNumber && !isCallerAllowed(fromNumber)) {
    return ndjsonResponse("Sorry, I don't have you on file. Please call back during business hours.");
  }

  // Ensure stub job + call exist in the store.
  if (fromNumber) getOrCreateStubJob(callId, fromNumber);

  const call =
    store.calls.get(callId) ??
    Array.from(store.calls.values()).find(
      (c) => c.fromNumber === fromNumber && c.status === "in_progress",
    );
  const job = call?.jobId ? store.getJob(call.jobId) : undefined;

  // ------------------------------------------------------------------
  // Bypass check — if the caller signals emergency/urgency, skip all
  // diagnosis and dispatch immediately.
  // ------------------------------------------------------------------
  if (isBypassIntent(transcript) && call) {
    store.upsertJob({ id: job?.id ?? call.jobId ?? "", status: "sourcing_contractor" });
    after(async () => {
      try { await runAgent({ callId: call.id }); } catch (e) { console.error("[runAgent bypass]", e); }
    });
    return ndjsonResponse("Understood — dispatching contractors right now. I'll send you an update as soon as someone's confirmed.");
  }

  // ------------------------------------------------------------------
  // Recall — fire on first turn, cache for the rest of the call.
  // Moss knowledge gives diagnostic guidance; Supermemory surfaces
  // past jobs and owner preferences at this property.
  // ------------------------------------------------------------------
  if (!voiceRecallCache.has(callId) && transcript.trim().length > 5) {
    const person = fromNumber ? findPersonByPhone(fromNumber) : undefined;
    const property = person ? findPropertyForPerson(person) : undefined;
    const address = property?.address ?? fromNumber;

    const [knowledgeRes, memoryRes] = await Promise.all([
      moss.searchKnowledge({ query: transcript, topK: 3 }).catch(() => ({ hits: [] as { id: string; text: string; score: number }[] })),
      supermemory.recall({ query: `${address} ${transcript}`, topK: 5 }).catch(() => ({ memories: [] as { id: string; text: string; score: number; metadata: Record<string, unknown> }[] })),
    ]);

    const ownerPrefs: string[] = [];
    const pastJobs: string[] = [];
    for (const m of memoryRes.memories) {
      if (/owner|prefer|portfolio|authoriz/i.test(m.text)) ownerPrefs.push(m.text);
      else pastJobs.push(m.text);
    }

    voiceRecallCache.set(callId, {
      knowledgeHits: knowledgeRes.hits.map((h) => h.text),
      pastJobs,
      ownerPrefs,
    });
  }

  const recall = voiceRecallCache.get(callId);

  // ------------------------------------------------------------------
  // Build system context
  // ------------------------------------------------------------------
  const person = fromNumber ? findPersonByPhone(fromNumber) : undefined;
  const property = person ? findPropertyForPerson(person) : undefined;
  const unit = person ? findUnitForPerson(person) : undefined;

  const lines: string[] = [
    "You are a property management AI agent in active diagnostic mode.",
    "Your job: ask specific, targeted questions to understand the maintenance issue clearly, then dispatch a contractor.",
    "Be concise (under 40 words per turn), calm, and professional.",
    "",
    "RULES:",
    "- Ask one focused question at a time to diagnose the issue (location, when it started, severity, related symptoms).",
    "- If the caller mentions emergency, urgency, or just wants someone sent — stop diagnosing and say you're dispatching now.",
    "- Once you have a clear picture, confirm what you've found and say you're arranging dispatch.",
    "- Never invent contractor names or ETAs. Say \"I'm arranging dispatch now.\"",
    "- Ask the tenant to send a photo if it will help assess damage.",
  ];

  if (person) {
    lines.push("");
    lines.push(`TENANT: ${person.name}${property ? ` at ${property.address}` : ""}${unit?.label ? `, Unit ${unit.label}` : ""}.`);
    lines.push("You already know who this is — greet them by name on the first turn.");
  }

  if (property) {
    const caps: string[] = [];
    const spendCap = unit?.spendCapCents ?? property.spendCapCents;
    if (spendCap) caps.push(`Spend cap: $${Math.round(spendCap / 100)}`);
    if (property.ownerInstructions) caps.push(`Owner rule: ${property.ownerInstructions}`);
    if (property.waterShutoffLocation) caps.push(`Water shutoff: ${property.waterShutoffLocation}`);
    if (property.hvacType) caps.push(`HVAC: ${property.hvacType}`);
    if (caps.length) { lines.push(""); lines.push(caps.join(" · ")); }
  }

  if (recall?.knowledgeHits.length) {
    lines.push("");
    lines.push("DIAGNOSTIC GUIDANCE (use these to ask better questions, don't read them aloud):");
    recall.knowledgeHits.forEach((h) => lines.push(`- ${h}`));
  }

  if (recall?.pastJobs.length) {
    lines.push("");
    lines.push("PROPERTY HISTORY:");
    recall.pastJobs.slice(0, 2).forEach((j) => lines.push(`- ${j}`));
  }

  if (recall?.ownerPrefs.length) {
    lines.push("");
    lines.push("OWNER PREFERENCES:");
    recall.ownerPrefs.slice(0, 1).forEach((p) => lines.push(`- ${p}`));
  }

  if (job?.visualContext) {
    lines.push("");
    lines.push(`VISUAL TRIAGE (photo already received): ${job.visualContext.description} — severity: ${job.visualContext.severity}.`);
    lines.push("Acknowledge what you can see and confirm you're dispatching.");
  }

  const systemContext = lines.join("\n");

  const history = recentHistory.map((h) => ({
    role: (h.role === "assistant" ? "model" : "user") as "user" | "model",
    text: h.content,
  }));

  const { text } = await gemini.generateVoiceResponse({ systemContext, history, userMessage: transcript });

  // Trigger dispatch once visual context is present and job still triaging.
  if (job?.visualContext && call && job.status === "triaging" && recentHistory.length >= 1) {
    store.upsertJob({ id: job.id, status: "sourcing_contractor" });
    after(async () => {
      try { await runAgent({ callId: call.id }); } catch (e) { console.error("[runAgent visual]", e); }
    });
  }

  return ndjsonResponse(text);
}

function ndjsonResponse(text: string): Response {
  return new Response(JSON.stringify({ text }) + "\n", {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
