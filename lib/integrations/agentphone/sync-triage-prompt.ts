import { AgentPhoneClient } from "agentphone";
import { env } from "@/lib/env";
import { buildTriagePrompt } from "./build-triage-prompt";

/**
 * Pushes the freshly-built triage prompt (system prompt + tenant directory)
 * to the live AgentPhone agent. Skips silently if the AgentPhone env isn't
 * configured (e.g. in a CI build or a dev process without keys).
 *
 * Returns `{ ok, agentId, promptBytes }` on success, `{ ok: false, reason }`
 * when skipped or failed. Never throws — callers can fire-and-forget.
 */
export async function syncTriagePromptIfConfigured(): Promise<{
  ok: boolean;
  agentId?: string;
  promptBytes?: number;
  reason?: string;
}> {
  const agentId = env.AGENTPHONE_AGENT_ID;
  const token = env.AGENTPHONE_API_KEY;
  if (!agentId || !token) {
    return { ok: false, reason: "AgentPhone env not configured" };
  }

  try {
    const sdk = new AgentPhoneClient({ token });
    const prompt = buildTriagePrompt();
    await sdk.agents.updateAgent({
      agent_id: agentId,
      systemPrompt: prompt,
    });
    return { ok: true, agentId, promptBytes: prompt.length };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
