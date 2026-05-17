/**
 * One-shot AgentPhone provisioner.
 *
 * Usage:
 *   pnpm exec tsx scripts/provision-agentphone.ts <https-webhook-url>
 *
 * What it does, idempotently where possible:
 *   1. Find or create the "Call My Agent — Property Triage" agent
 *      (system prompt comes from lib/integrations/agentphone/system-prompt.ts).
 *   2. Attach +15673671109 (id cmpa51bne05y7jz00hjay8msd) to that agent
 *      via PATCH /v1/numbers/{id}.
 *   3. Register the supplied webhook URL via POST /v1/webhooks.
 *   4. Print the env values to paste into .env.local.
 *
 * Re-running is safe: existing agent reused, number re-attached if needed.
 * A NEW webhook secret is minted on each run — REPLACE the env var with
 * the printed value each time.
 */
import { TRIAGE_AGENT_SYSTEM_PROMPT } from "@/lib/integrations/agentphone/system-prompt";

const BASE = "https://api.agentphone.ai";
const TARGET_NUMBER_ID = "cmpa51bne05y7jz00hjay8msd";
const TARGET_NUMBER = "+15673671109";
const AGENT_NAME = "Call My Agent — Property Triage";

const token = process.env.AGENTPHONE_API_KEY;
if (!token) {
  console.error("AGENTPHONE_API_KEY not set in env (try: export $(grep -v '^#' .env.local | xargs) before running)");
  process.exit(1);
}

const webhookUrl = process.argv[2];
if (!webhookUrl) {
  console.error("Usage: pnpm exec tsx scripts/provision-agentphone.ts <https-webhook-url>");
  process.exit(1);
}
if (!/^https:\/\//.test(webhookUrl)) {
  console.error("webhook-url must be https://...");
  process.exit(1);
}

async function ap<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

async function findOrCreateAgent(): Promise<string> {
  const list = await ap<{ data: Array<{ id: string; name: string }> }>("/v1/agents?limit=50");
  const existing = list.data.find((a) => a.name === AGENT_NAME);
  if (existing) {
    console.log(`✓ agent exists: ${existing.id} (${existing.name})`);
    return existing.id;
  }
  const created = await ap<{ id: string }>("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      name: AGENT_NAME,
      systemPrompt: TRIAGE_AGENT_SYSTEM_PROMPT,
      beginMessage: "Property line. What's going on?",
      voiceMode: "hosted",
      modelTier: "balanced",
      enableMessaging: false,
    }),
  });
  console.log(`✓ agent created: ${created.id}`);
  return created.id;
}

async function attachNumber(agentId: string): Promise<void> {
  await ap(`/v1/numbers/${TARGET_NUMBER_ID}`, {
    method: "PATCH",
    body: JSON.stringify({ agentId }),
  });
  console.log(`✓ attached ${TARGET_NUMBER} to agent ${agentId}`);
}

async function registerWebhook(url: string): Promise<{ id: string; secret: string }> {
  const r = await ap<{ id: string; secret: string }>("/v1/webhooks", {
    method: "POST",
    body: JSON.stringify({ url, contextLimit: 10, timeout: 30 }),
  });
  console.log(`✓ webhook registered: ${r.id}`);
  return r;
}

async function main(): Promise<void> {
  const agentId = await findOrCreateAgent();
  await attachNumber(agentId);
  const { secret } = await registerWebhook(webhookUrl);

  console.log("\n--- Paste these into .env.local (replace existing values) ---");
  console.log(`AGENTPHONE_AGENT_ID=${agentId}`);
  console.log(`AGENTPHONE_NUMBER=${TARGET_NUMBER}`);
  console.log(`AGENTPHONE_WEBHOOK_SECRET=${secret}`);
  console.log("\nThen restart the dev server so env vars reload: pkill -f 'next dev' && pnpm dev");
}

main().catch((err) => {
  console.error("FAILED:", err.message ?? err);
  process.exit(1);
});
