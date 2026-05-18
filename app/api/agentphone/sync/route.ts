import "@/lib/store/bootstrap";
import { buildTriagePrompt } from "@/lib/integrations/agentphone/build-triage-prompt";
import { syncTriagePromptIfConfigured } from "@/lib/integrations/agentphone/sync-triage-prompt";

/**
 * Pushes the latest tenant directory into the AgentPhone triage agent's
 * system prompt. Call this whenever the tenant DB changes so the live agent
 * always knows about every Person → Property → Unit relationship.
 *
 * Auto-syncs once per lambda cold start via `lib/store/bootstrap.ts` —
 * this endpoint is the manual override (dashboard button, retries).
 */
export async function POST(): Promise<Response> {
  const result = await syncTriagePromptIfConfigured();
  if (!result.ok) {
    return Response.json(
      { ok: false, error: "sync failed", detail: result.reason },
      { status: result.reason === "AgentPhone env not configured" ? 500 : 502 },
    );
  }
  const prompt = buildTriagePrompt();
  return Response.json({
    ok: true,
    agentId: result.agentId,
    promptBytes: result.promptBytes,
    tenantCount: prompt.match(/^- From /gm)?.length ?? 0,
  });
}

export async function GET(): Promise<Response> {
  // Convenience: preview the prompt without pushing it.
  return new Response(buildTriagePrompt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
