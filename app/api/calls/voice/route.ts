import { z } from "zod";
import { agentphone } from "@/lib/integrations/agentphone";
import { gemini } from "@/lib/integrations/gemini";
import { store } from "@/lib/store/memory";
import { runAgent } from "@/lib/orchestrator/run";
import { env } from "@/lib/env";

const BodySchema = z.object({
  fromNumber: z.string().optional(),
  transcript: z.string().optional(),
  callId: z.string().optional(),
  recentHistory: z.array(z.object({ role: z.string(), text: z.string() })).optional(),
}).passthrough();

function verifyWebhookSecret(request: Request): boolean {
  const secret = env.AGENTPHONE_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — allow in dev/mock mode
  const sig = request.headers.get("x-agentphone-signature") ?? "";
  return sig === secret;
}

const SYSTEM_CONTEXT = `You are a property management AI agent for a residential property management company.
Your job: triage maintenance issues, collect information, and dispatch the right contractor.
Be concise, professional, and empathetic. If the tenant describes a problem, ask them to send a photo to help you assess it accurately.
Once you have enough information (description + optional photo), confirm you're dispatching help and give an estimated response time.
Never make up contractor names or ETAs — say "I'm arranging dispatch now."`;

export async function POST(request: Request): Promise<Response> {
  if (!verifyWebhookSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.text();
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(raw.length > 0 ? JSON.parse(raw) : {});
  } catch {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  void parsed;

  const replay = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: raw.length > 0 ? raw : undefined,
  });

  const webhookData = await agentphone.parseVoiceWebhook(replay);
  const { callId, fromNumber, transcript, recentHistory } = webhookData;

  // Resolve call and job from store
  const call =
    store.calls.get(callId) ??
    Array.from(store.calls.values()).find(
      (c) => c.fromNumber === fromNumber && c.status === "in_progress",
    );

  const job = call?.jobId ? store.getJob(call.jobId) : undefined;

  // Build context string including visual triage if available
  let systemContext = SYSTEM_CONTEXT;
  if (job?.visualContext) {
    systemContext += `\n\nVISUAL TRIAGE RESULT: You have already analyzed a photo from this tenant.
Description: ${job.visualContext.description}
Severity: ${job.visualContext.severity}
Guidelines: ${job.visualContext.guidelines.map((g) => g.text).join(" | ")}
Use this information in your response — acknowledge what you can see and confirm dispatch.`;
  }

  // Generate agent response
  const { text } = await gemini.generateVoiceResponse({
    systemContext,
    history: recentHistory,
    userMessage: transcript,
  });

  // Trigger dispatch once: only if visualContext is present AND job not already dispatched.
  // Guards against firing runAgent on every subsequent voice turn.
  const jobStatus = job?.status;
  if (
    job?.visualContext &&
    call &&
    jobStatus === "triaging" &&
    recentHistory.length >= 1
  ) {
    // Mark as sourcing so concurrent turns skip this block
    store.upsertJob({ id: job.id, status: "sourcing_contractor" });
    void runAgent({ callId: call.id }).catch(console.error);
  }

  // Return NDJSON stream (AgentPhone TTS starts on first chunk)
  // For simplicity in v1, return a single chunk. Wire streaming in v2.
  const ndjson = JSON.stringify({ text }) + "\n";
  return new Response(ndjson, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  });
}
