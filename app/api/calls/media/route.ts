import { z } from "zod";
import { gemini } from "@/lib/integrations/gemini";
import { supermemory } from "@/lib/integrations/supermemory";
import { store } from "@/lib/store/memory";
import { env } from "@/lib/env";
import type { Job } from "@/lib/types";

const BodySchema = z
  .object({
    fromNumber: z.string(),
    // SSRF guard: only allow https:// URLs pointing to non-internal hosts
    mediaUrl: z.string().url().refine((url) => {
      try {
        const u = new URL(url);
        if (u.protocol !== "https:") return false;
        const host = u.hostname;
        // Block link-local, loopback, and private ranges
        if (host === "localhost" || host.endsWith(".local")) return false;
        if (/^127\./.test(host) || host === "::1") return false;
        if (/^169\.254\./.test(host)) return false;
        if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
        return true;
      } catch {
        return false;
      }
    }, { message: "mediaUrl must be a public https:// URL" }),
    mimeType: z
      .enum(["image/jpeg", "image/png", "image/webp"])
      .default("image/jpeg"),
  })
  .passthrough();

function verifyWebhookSecret(request: Request): boolean {
  const secret = env.AGENTPHONE_WEBHOOK_SECRET;
  if (!secret) return true;
  const sig = request.headers.get("x-agentphone-signature") ?? "";
  return sig === secret;
}

export async function POST(request: Request): Promise<Response> {
  if (!verifyWebhookSecret(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    parsed = BodySchema.parse(raw);
  } catch (err) {
    return Response.json(
      { error: "Invalid request body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const { fromNumber, mediaUrl, mimeType } = parsed;

  // Respond immediately — fire-and-forget the async work.
  void (async () => {
    let job: Job | undefined;
    try {
      // a. Find the active call for this number.
      const call = Array.from(store.calls.values()).find(
        (c) => c.fromNumber === fromNumber && c.status === "in_progress",
      );
      if (!call) {
        console.error(
          `[media webhook] No in-progress call found for fromNumber=${fromNumber}`,
        );
        return;
      }

      // c. Get the job linked to this call.
      job = store.getJob(call.jobId ?? "");
      if (!job) {
        console.error(
          `[media webhook] No job found for call=${call.id} jobId=${call.jobId}`,
        );
        return;
      }

      // d. Analyze the media with Gemini.
      const { description, severity } = await gemini.analyzeMedia({
        mediaUrl,
        mimeType,
      });

      // e. Recall relevant guidelines from Supermemory.
      const { memories } = await supermemory.recall({
        query: description,
        topK: 3,
      });

      // f. Persist the visual context on the job.
      store.upsertJob({
        id: job.id,
        visualContext: {
          description,
          severity,
          guidelines: memories,
          mediaUrl,
        },
      });

      // g. Append a visual_triage event.
      store.appendEvent({
        jobId: job.id,
        kind: "visual_triage",
        title: "Visual triage complete",
        detail: description.slice(0, 120),
      });
    } catch (err) {
      // Only append event if we have a real jobId — avoid ghost events
      if (job?.id) {
        store.appendEvent({
          jobId: job.id,
          kind: "visual_triage",
          title: "Visual triage failed",
          detail: String(err),
        });
      } else {
        console.error("[media webhook] visual triage failed (no job resolved):", err);
      }
    }
  })();

  return Response.json({ received: true });
}
