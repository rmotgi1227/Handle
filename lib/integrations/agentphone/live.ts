import { z } from "zod";
import { AgentPhoneClient as SdkClient } from "agentphone";
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
    const agentId = env.AGENTPHONE_AGENT_ID;
    if (!agentId) {
      throw new IntegrationError(
        "agentphone",
        "AGENTPHONE_AGENT_ID is not set — run scripts/provision-agentphone.ts to create the triage agent first.",
      );
    }
    // SDK return type shifts between versions; cast at the boundary only.
    const result = (await sdk().calls.createOutboundCall({
      agentId,
      toNumber: input.toNumber,
      initialGreeting: input.script.slice(0, 240),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as { id?: string; callId?: string };
    const callId = result.callId ?? result.id;
    if (!callId) {
      throw new IntegrationError("agentphone", "createOutboundCall returned no call id");
    }
    return { callId };
  },
};
