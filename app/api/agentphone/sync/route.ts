import "@/lib/store/bootstrap";
import { AgentPhoneClient } from "agentphone";
import { env, requireEnv } from "@/lib/env";
import { buildTriagePrompt } from "@/lib/integrations/agentphone/build-triage-prompt";

/**
 * Pushes the latest tenant directory into the AgentPhone triage agent's
 * system prompt. Call this whenever the tenant DB changes so the live agent
 * always knows about every Person → Property → Unit relationship.
 *
 * Returns the byte size of the synced prompt so the dashboard can confirm
 * the update landed.
 */
export async function POST(): Promise<Response> {
  const agentId = env.AGENTPHONE_AGENT_ID;
  if (!agentId) {
    return Response.json(
      { error: "AGENTPHONE_AGENT_ID is not set" },
      { status: 500 },
    );
  }
  const token = requireEnv("AGENTPHONE_API_KEY");
  const sdk = new AgentPhoneClient({ token });

  const prompt = buildTriagePrompt();

  try {
    // SDK takes a single object with agent_id (snake_case per OpenAPI).
    await sdk.agents.updateAgent({
      agent_id: agentId,
      systemPrompt: prompt,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: "updateAgent failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    agentId,
    promptBytes: prompt.length,
    tenantCount: prompt.match(/^- From /gm)?.length ?? 0,
  });
}

export async function GET(): Promise<Response> {
  // Convenience: preview the prompt without pushing it.
  return new Response(buildTriagePrompt(), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
