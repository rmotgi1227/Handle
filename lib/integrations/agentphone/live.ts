import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { AgentPhoneClient } from "./index";

/**
 * Live AgentPhone client — STUB.
 *
 * TODO: wire AgentPhone live API — set AGENTPHONE_API_KEY (and
 * AGENTPHONE_NUMBER / AGENTPHONE_WEBHOOK_SECRET as needed) and replace
 * this stub. Endpoint base URL pending teammate confirmation; check
 * https://docs.agentphone.dev (placeholder) for:
 *   - inbound webhook payload schema → parseInboundWebhook
 *   - GET /calls/:id/transcript    → fetchTranscript
 *   - POST /calls                  → placeOutboundCall
 *
 * When implementing:
 * - Verify webhook signature via AGENTPHONE_WEBHOOK_SECRET (HMAC).
 * - Validate the parsed payload with Zod at the boundary.
 * - Pass AGENTPHONE_NUMBER as the default `fromNumber` when not provided.
 */
function notWired(method: string): never {
  if (!env.AGENTPHONE_API_KEY) {
    throw new IntegrationError(
      "agentphone",
      `AGENTPHONE_API_KEY missing — cannot call ${method} in live mode. ` +
        `Set AGENTPHONE_API_KEY or switch INTEGRATION_MODE=mock.`,
    );
  }
  throw new IntegrationError(
    "agentphone",
    `${method} live implementation is a TODO. Wire the real AgentPhone API here.`,
  );
}

export const agentphone: AgentPhoneClient = {
  async parseInboundWebhook(_req) {
    notWired("parseInboundWebhook");
  },
  async fetchTranscript(_callId) {
    notWired("fetchTranscript");
  },
  async placeOutboundCall(_input) {
    notWired("placeOutboundCall");
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
};
