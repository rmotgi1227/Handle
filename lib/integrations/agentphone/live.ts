import { z } from "zod";
import { AgentPhoneClient as SdkClient, type AgentPhone } from "agentphone";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env, requireEnv } from "@/lib/env";
import type { AgentPhoneClient } from "./index";

/**
 * Live AgentPhone client. The official SDK handles auth + retries; we wrap it
 * so the rest of the app stays decoupled from the vendor surface.
 *
 * `parseInboundWebhook` is intentionally narrow: it only normalizes the
 * "first contact" shape the orchestrator needs. The richer webhook-event
 * dispatch (agent.message vs agent.call_ended) lives in the route handler,
 * not here.
 */

let _sdk: SdkClient | null = null;
function sdk(): SdkClient {
  if (_sdk) return _sdk;
  const token = requireEnv("AGENTPHONE_API_KEY");
  _sdk = new SdkClient({ token });
  return _sdk;
}

const InboundEventSchema = z
  .object({
    event: z.string(),
    timestamp: z.string().optional(),
    data: z
      .object({
        callId: z.string(),
        from: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

const TranscriptEntrySchema = z.object({
  role: z.enum(["agent", "user"]),
  content: z.string(),
  timestamp: z.string().optional(),
});
const TranscriptResponseSchema = z.object({
  transcript: z.array(TranscriptEntrySchema),
});

export const agentphone: AgentPhoneClient = {
  async parseInboundWebhook(req) {
    const raw = await req.clone().text();
    let body: unknown;
    try {
      body = raw.length > 0 ? JSON.parse(raw) : {};
    } catch (err) {
      throw new IntegrationError("agentphone", `webhook body is not JSON: ${(err as Error).message}`, err);
    }
    const parsed = InboundEventSchema.safeParse(body);
    if (!parsed.success) {
      throw new IntegrationError(
        "agentphone",
        `webhook payload did not match expected shape: ${parsed.error.message}`,
        parsed.error,
      );
    }
    return {
      callId: parsed.data.data.callId,
      fromNumber: parsed.data.data.from,
      startedAt: parsed.data.timestamp ?? new Date().toISOString(),
    };
  },

  async fetchTranscript(callId) {
    const res = await fetch(
      `https://api.agentphone.ai/v1/calls/${encodeURIComponent(callId)}/transcript`,
      {
        headers: { Authorization: `Bearer ${requireEnv("AGENTPHONE_API_KEY")}` },
      },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "(no body)");
      throw new IntegrationError("agentphone", `fetchTranscript ${res.status}: ${detail}`);
    }
    const json = TranscriptResponseSchema.parse(await res.json());
    return json.transcript.map((line) => ({
      at: line.timestamp ?? new Date().toISOString(),
      speaker: line.role === "agent" ? ("agent" as const) : ("caller" as const),
      text: line.content,
    }));
  },

  async placeOutboundCall(input) {
    // Outbound uses the dedicated CONTRACTOR agent — different system prompt
    // (we're the requestor, not the responder). Fall back to the triage agent
    // only if the contractor one isn't provisioned yet, so demos don't break.
    const agentId =
      env.AGENTPHONE_CONTRACTOR_AGENT_ID ?? env.AGENTPHONE_AGENT_ID;
    if (!agentId) {
      throw new IntegrationError(
        "agentphone",
        "Neither AGENTPHONE_CONTRACTOR_AGENT_ID nor AGENTPHONE_AGENT_ID is set — run scripts/provision-agentphone.ts first.",
      );
    }
    // The SDK's CreateOutboundCallRequest only types the documented fields,
    // but the backing POST forwards extra fields verbatim. We extend the SDK
    // type with the orchestrator's pass-through fields:
    //   - conversationState: negotiation context (target, walk-away, comps,
    //     history) the dispatch prompt reads on the contractor side.
    //   - metadata: jobId/contractorId echoed back on call_ended so the
    //     webhook can find the originating job.
    type OutboundCallPayload = AgentPhone.CreateOutboundCallRequest & {
      conversationState?: unknown;
      metadata?: Record<string, unknown>;
    };
    const payload: OutboundCallPayload = {
      agentId,
      toNumber: input.toNumber,
      initialGreeting: input.script.slice(0, 240),
    };
    if (input.negotiationContext) {
      payload.conversationState = input.negotiationContext;
    }
    if (input.metadata) {
      payload.metadata = input.metadata;
    }
    // SDK return type is `unknown` (HttpResponsePromise<unknown>); narrow at
    // the boundary to the only fields we consume.
    const result = (await sdk().calls.createOutboundCall(payload)) as {
      id?: string;
      callId?: string;
    };
    const callId = result.callId ?? result.id;
    if (!callId) {
      throw new IntegrationError("agentphone", "createOutboundCall returned no call id");
    }
    return { callId };
  },
  async parseVoiceWebhook(req) {
    let body: Record<string, unknown> = {};
    try { body = (await req.clone().json()) as Record<string, unknown>; } catch { body = {}; }
    // AgentPhone webhook shape: { event, channel, callId, fromNumber, transcript, recentHistory }
    const fromNumber = typeof body.fromNumber === "string" ? body.fromNumber : "";
    const transcript = typeof body.transcript === "string" ? body.transcript : "";
    const callId = typeof body.callId === "string" ? body.callId : "";
    const history = Array.isArray(body.recentHistory)
      ? (body.recentHistory as { role: string; content: string }[]).map(h => ({
          role: (h.role === "assistant" ? "model" : "user") as "user" | "model",
          text: String(h.content ?? ""),
        }))
      : [];
    return { callId, fromNumber, transcript, recentHistory: history };
  },
  async sendSms(input) {
    const agentId = env.AGENTPHONE_AGENT_ID;
    if (!agentId) {
      throw new IntegrationError(
        "agentphone",
        "AGENTPHONE_AGENT_ID missing — set it to send SMS via AgentPhone.",
      );
    }
    // Uses the AgentPhone messages.sendMessage SDK method (POST /v1/messages).
    // The SDK returns HttpResponsePromise<unknown>; narrow at the boundary.
    const result = (await sdk().messages.sendMessage({
      agent_id: agentId,
      to_number: input.to,
      body: input.body,
    })) as { id?: string; messageId?: string };
    const messageId = result?.id ?? result?.messageId ?? "sent";
    return { messageId };
  },
};
