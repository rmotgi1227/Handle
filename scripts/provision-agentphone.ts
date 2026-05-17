/**
 * One-shot AgentPhone provisioner.
 *
 * Usage:
 *   pnpm exec tsx scripts/provision-agentphone.ts <https-webhook-url>
 *
 * What it does, idempotently where possible:
 *   1. Find or create the inbound triage agent ("Call My Agent — Property
 *      Triage") with the tenant system prompt.
 *   2. Attach +15673671109 to the triage agent.
 *   3. Register the supplied webhook URL with the triage agent.
 *   4. Find or create the outbound contractor agent ("Call My Agent —
 *      Contractor Dispatch") with the contractor system prompt. No number
 *      attached — outbound only, AgentPhone picks an outbound caller-ID.
 *   5. Print the env values to paste into .env.local.
 *
 * Re-running is safe: existing agents are reused, number re-attached if
 * needed. A NEW webhook secret is minted on each run — replace the env
 * var with the printed value each time.
 */
import { TRIAGE_AGENT_SYSTEM_PROMPT } from "@/lib/integrations/agentphone/system-prompt";
import { CONTRACTOR_DISPATCH_SYSTEM_PROMPT } from "@/lib/integrations/agentphone/contractor-prompt";

const BASE = "https://api.agentphone.ai";
const TARGET_NUMBER_ID = "cmpa51bne05y7jz00hjay8msd";
const TARGET_NUMBER = "+15673671109";
const TRIAGE_NAME = "Call My Agent — Property Triage";
const CONTRACTOR_NAME = "Call My Agent — Contractor Dispatch";

const token = process.env.AGENTPHONE_API_KEY;
if (!token) {
  console.error("AGENTPHONE_API_KEY not set (try: set -a && source .env.local && set +a)");
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

interface AgentConfig {
  name: string;
  systemPrompt: string;
  beginMessage: string;
  voice: string;
}

async function findOrCreateAgent(cfg: AgentConfig): Promise<string> {
  const list = await ap<{ data: Array<{ id: string; name: string }> }>("/v1/agents?limit=50");
  const existing = list.data.find((a) => a.name === cfg.name);
  if (existing) {
    console.log(`✓ agent exists: ${existing.id} (${existing.name})`);
    // Push latest prompt / begin message on every run so edits to the .ts
    // files actually take effect without a manual PATCH.
    await ap(`/v1/agents/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        systemPrompt: cfg.systemPrompt,
        beginMessage: cfg.beginMessage,
        voice: cfg.voice,
        voiceMode: "hosted",
      }),
    });
    console.log(`  ↳ refreshed prompt/begin/voice`);
    return existing.id;
  }
  const created = await ap<{ id: string }>("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      name: cfg.name,
      systemPrompt: cfg.systemPrompt,
      beginMessage: cfg.beginMessage,
      voiceMode: "hosted",
      modelTier: "balanced",
      enableMessaging: false,
      voice: cfg.voice,
    }),
  });
  console.log(`✓ agent created: ${created.id} (${cfg.name})`);
  return created.id;
}

async function attachNumber(agentId: string): Promise<void> {
  try {
    await ap(`/v1/agents/${agentId}/numbers`, {
      method: "POST",
      body: JSON.stringify({ numberId: TARGET_NUMBER_ID }),
    });
    console.log(`✓ attached ${TARGET_NUMBER} to ${agentId}`);
  } catch (err) {
    // Already attached → 409 is fine, treat as idempotent.
    const msg = (err as Error).message;
    if (/409|already/i.test(msg)) {
      console.log(`✓ ${TARGET_NUMBER} already attached to ${agentId}`);
    } else {
      throw err;
    }
  }
}

async function registerWebhook(agentId: string, url: string): Promise<{ id: string; secret: string }> {
  const r = await ap<{ id: string; secret: string }>(
    `/v1/agents/${agentId}/webhook`,
    {
      method: "POST",
      body: JSON.stringify({ url, contextLimit: 10, timeout: 30 }),
    },
  );
  console.log(`✓ webhook registered on ${agentId}: ${r.id}`);
  return r;
}

async function main(): Promise<void> {
  const triageId = await findOrCreateAgent({
    name: TRIAGE_NAME,
    systemPrompt: TRIAGE_AGENT_SYSTEM_PROMPT,
    beginMessage: "Hey, you've reached the maintenance line — what's going on?",
    voice: "cartesia-Cleo",
  });
  await attachNumber(triageId);
  const { secret } = await registerWebhook(triageId, webhookUrl);

  // CRITICAL: registering a webhook silently flips the agent to voiceMode:
  // "webhook" (where AgentPhone expects our backend to generate every reply).
  // We use webhooks for observability ONLY — the conversation is hosted.
  // Force the mode back AFTER the webhook lands.
  await ap(`/v1/agents/${triageId}`, {
    method: "PATCH",
    body: JSON.stringify({ voiceMode: "hosted" }),
  });
  console.log(`  ↳ pinned ${triageId} back to hosted voiceMode`);

  // Outbound contractor agent — no number attached. AgentPhone uses an
  // available outbound number when placeOutboundCall is invoked.
  const contractorId = await findOrCreateAgent({
    name: CONTRACTOR_NAME,
    systemPrompt: CONTRACTOR_DISPATCH_SYSTEM_PROMPT,
    // Begin message is overridden per-call via placeOutboundCall's
    // initialGreeting. This is just a sensible fallback.
    beginMessage: "Hi, this is Property Dispatch. I've got a job I'm hoping you can take.",
    voice: "minimax-Daniel",
  });

  console.log("\n--- Paste these into .env.local (replace existing values) ---");
  console.log(`AGENTPHONE_AGENT_ID=${triageId}`);
  console.log(`AGENTPHONE_CONTRACTOR_AGENT_ID=${contractorId}`);
  console.log(`AGENTPHONE_NUMBER=${TARGET_NUMBER}`);
  console.log(`AGENTPHONE_WEBHOOK_SECRET=${secret}`);
  console.log("\nThen restart the dev server so env vars reload: pkill -f 'next dev' && pnpm dev");
}

main().catch((err) => {
  console.error("FAILED:", err.message ?? err);
  process.exit(1);
});
