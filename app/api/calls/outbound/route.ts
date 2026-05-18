/**
 * /api/calls/outbound — AgentPhone webhook for OUTBOUND contractor dials.
 *
 * Closes the loop on a real contractor call:
 *  1. AgentPhone fires `agent.call_ended` for the outbound call we placed
 *     in `dialContractorForJob`.
 *  2. We verify the HMAC signature (when configured).
 *  3. We find the originating ContractorCall record (by metadata.jobId +
 *     metadata.contractorId, falling back to the callId map we keyed when
 *     placing the call).
 *  4. We hand the transcript to Gemini's `parseContractorOutcome`, which
 *     returns the REAL outcome — accepted / declined / callback / no_answer —
 *     plus the agreed price and ETA window when the agent closed the deal.
 *  5. We overwrite the placeholder dial outcome (from `simulateDialOutcome`)
 *     with the real one, emit a `contractor_dial_outcome` job event, and
 *     200 back to AgentPhone.
 *
 * This route is intentionally narrow — it never re-dials, re-routes, or
 * decides who wins the race. It just records the truth of what already
 * happened on the wire.
 */

import { z } from "zod";
import { env } from "@/lib/env";
import { verifyAgentPhoneWebhook } from "@/lib/integrations/agentphone/webhook-verify";
import { gemini } from "@/lib/integrations/gemini";
import { store } from "@/lib/store/memory";
import {
  kvGetContractorCall,
  kvSetContractorCall,
} from "@/lib/store/contractor-calls-kv";
import type { ContractorCallOutcome } from "@/lib/types";

const OutboundCallEndedSchema = z
  .object({
    event: z.literal("agent.call_ended"),
    timestamp: z.string().optional(),
    data: z
      .object({
        callId: z.string(),
        durationSeconds: z.number().optional(),
        transcript: z
          .array(
            z.object({
              role: z.enum(["agent", "user"]),
              content: z.string(),
              timestamp: z.string().optional(),
            }),
          )
          .default([]),
        summary: z.string().optional(),
        metadata: z
          .object({
            jobId: z.string().optional(),
            contractorId: z.string().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();

  // AgentPhone mints a per-webhook secret; the contractor agent's webhook
  // has its own secret distinct from the inbound triage one. Prefer the
  // contractor-specific env, fall back to the legacy single secret so
  // older deploys without the new env still verify.
  const secret =
    env.AGENTPHONE_CONTRACTOR_WEBHOOK_SECRET ?? env.AGENTPHONE_WEBHOOK_SECRET;
  if (secret) {
    const result = verifyAgentPhoneWebhook({
      rawBody,
      signature: request.headers.get("x-webhook-signature"),
      timestamp: request.headers.get("x-webhook-timestamp"),
      secret,
    });
    if (!result.ok) {
      return Response.json(
        { error: "signature rejected", reason: result.reason },
        { status: 401 },
      );
    }
  }

  let parsed: unknown;
  try {
    parsed = rawBody.length > 0 ? JSON.parse(rawBody) : {};
  } catch (err) {
    return Response.json(
      { error: "invalid JSON body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const body = OutboundCallEndedSchema.safeParse(parsed);
  if (!body.success) {
    // Not a call_ended event we care about — ack 202 so AgentPhone doesn't retry.
    return Response.json(
      { ok: true, ignored: "non-matching event" },
      { status: 202 },
    );
  }

  const { callId, transcript, summary, metadata } = body.data.data;
  const endedAt = body.data.timestamp ?? new Date().toISOString();

  // Find the originating ContractorCall record.
  //   1. Prefer the callId we already stored (most reliable).
  //   2. Cross-lambda: check Redis — the dispatch lambda mirrors every
  //      placeholder there so a different webhook lambda can still find it.
  //   3. Fall back to metadata.{jobId, contractorId} if AgentPhone re-emitted
  //      a new callId for the leg (rare, but seen in practice).
  let record = store.contractorCalls.get(callId);
  if (!record) {
    const shared = await kvGetContractorCall(callId);
    if (shared) {
      record = shared;
      store.contractorCalls.set(callId, shared);
    }
  }
  if (!record && metadata?.jobId && metadata?.contractorId) {
    for (const c of store.contractorCalls.values()) {
      if (c.jobId === metadata.jobId && c.contractorId === metadata.contractorId) {
        record = c;
        break;
      }
    }
  }

  if (!record) {
    // Webhook for a call we never placed — log + ack.
    console.warn(`[outbound-webhook] no ContractorCall for callId=${callId}`);
    return Response.json({ ok: true, ignored: "unknown callId" }, { status: 202 });
  }

  // Idempotency: AgentPhone retries on slow responses. If we've already
  // resolved this with a non-placeholder transcript, treat repeats as no-ops.
  if (record.transcriptSummary && record.endedAt) {
    return Response.json({ ok: true, alreadyResolved: true });
  }

  const job = store.getJob(record.jobId);
  const contractor = store.contractors.get(record.contractorId);
  if (!job || !contractor) {
    console.warn(`[outbound-webhook] missing job/contractor for ${callId}`);
    return Response.json({ ok: true, ignored: "missing job/contractor" }, { status: 202 });
  }

  // Parse the call with Gemini. If parsing throws, keep the placeholder
  // outcome — better stale than wrong.
  let parsedOutcome: {
    outcome: ContractorCallOutcome;
    priceCents?: number;
    etaWindow?: string;
    notes?: string;
  };
  try {
    parsedOutcome = await gemini.parseContractorOutcome({
      jobTitle: job.title,
      urgency: job.urgency,
      contractorName: contractor.name,
      transcript: transcript.map((t) => ({ role: t.role, text: t.content })),
    });
  } catch (err) {
    console.error(`[outbound-webhook] parseContractorOutcome failed:`, err);
    return Response.json(
      { ok: false, error: "parse_failed", detail: (err as Error).message },
      { status: 200 },
    );
  }

  const transcriptSummary =
    summary ??
    `${transcript.length} turn${transcript.length === 1 ? "" : "s"}: ${parsedOutcome.notes ?? parsedOutcome.outcome}`;

  const resolved = {
    ...record,
    endedAt,
    outcome: parsedOutcome.outcome,
    quotedPriceCents: parsedOutcome.priceCents,
    etaWindow: parsedOutcome.etaWindow ?? record.etaWindow,
    transcriptSummary,
  };
  store.contractorCalls.set(callId, resolved);
  // Mirror to Redis so the dispatch lambda (which may be a different instance)
  // sees the outcome on its next poll iteration.
  await kvSetContractorCall(resolved);

  store.appendEvent({
    jobId: record.jobId,
    kind: "contractor_dial_outcome",
    title: `${contractor.name} · ${prettyOutcome(parsedOutcome.outcome)}`,
    detail:
      parsedOutcome.outcome === "accepted_job"
        ? `${parsedOutcome.priceCents ? `$${(parsedOutcome.priceCents / 100).toFixed(0)} · ` : ""}${parsedOutcome.etaWindow ?? "ETA TBD"}${parsedOutcome.notes ? ` · ${parsedOutcome.notes}` : ""}`
        : (parsedOutcome.notes ?? undefined),
    data: {
      contractorId: record.contractorId,
      contractorCallId: callId,
      outcome: parsedOutcome.outcome,
      priceCents: parsedOutcome.priceCents,
      etaWindow: parsedOutcome.etaWindow,
      source: "outbound_webhook",
    },
  });

  return Response.json({
    ok: true,
    jobId: record.jobId,
    contractorId: record.contractorId,
    outcome: parsedOutcome.outcome,
    priceCents: parsedOutcome.priceCents,
    etaWindow: parsedOutcome.etaWindow,
  });
}

function prettyOutcome(o: ContractorCallOutcome): string {
  switch (o) {
    case "accepted_job":
      return "accepted";
    case "declined":
      return "declined";
    case "callback_scheduled":
      return "callback scheduled";
    case "no_answer":
      return "no answer";
    case "voicemail":
      return "voicemail";
    case "quoted":
      return "quoted";
  }
}
