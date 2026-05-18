import { AgentPhoneClient } from "agentphone";
import { env } from "@/lib/env";

/**
 * Switches the triage agent to webhook mode so every voice turn is forwarded
 * to our /api/calls/incoming endpoint instead of being handled by AgentPhone's
 * built-in LLM. Gemini drives the conversation from there.
 *
 * Skips silently when AgentPhone env isn't configured (CI, mock-mode dev).
 * Never throws — callers can fire-and-forget.
 */
export async function syncTriagePromptIfConfigured(): Promise<{
  ok: boolean;
  agentId?: string;
  reason?: string;
}> {
  const agentId = env.AGENTPHONE_AGENT_ID;
  const token = env.AGENTPHONE_API_KEY;
  if (!agentId || !token) {
    return { ok: false, reason: "AgentPhone env not configured" };
  }

  try {
    const sdk = new AgentPhoneClient({ token });
    // Switch from hosted LLM to webhook mode. AgentPhone will POST each
    // voice turn to our account webhook URL (/api/calls/incoming) with
    // { callId, fromNumber, transcript, recentHistory } instead of handling
    // the conversation itself. systemPrompt is irrelevant in webhook mode.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await sdk.agents.updateAgent({
      agent_id: agentId,
      voiceMode: "webhook" as any,
      systemPrompt: null,
    });
    return { ok: true, agentId };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
