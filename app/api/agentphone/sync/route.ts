import "@/lib/store/bootstrap";
import { syncTriagePromptIfConfigured } from "@/lib/integrations/agentphone/sync-triage-prompt";

/**
 * Switches the AgentPhone triage agent to webhook mode so voice turns are
 * forwarded to our Gemini-backed /api/calls/incoming handler instead of
 * AgentPhone's built-in LLM. Safe to call repeatedly (idempotent).
 *
 * Auto-runs once per lambda cold start via `lib/store/bootstrap.ts`.
 */
export async function POST(): Promise<Response> {
  const result = await syncTriagePromptIfConfigured();
  if (!result.ok) {
    return Response.json(
      { ok: false, error: "sync failed", detail: result.reason },
      { status: result.reason === "AgentPhone env not configured" ? 500 : 502 },
    );
  }
  return Response.json({
    ok: true,
    agentId: result.agentId,
    voiceMode: "webhook",
  });
}

export async function GET(): Promise<Response> {
  return Response.json({ info: "POST to switch agent to webhook mode" });
}
