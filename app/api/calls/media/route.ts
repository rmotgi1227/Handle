import { z } from "zod";
import { gemini } from "@/lib/integrations/gemini";
import { supermemory } from "@/lib/integrations/supermemory";
import { store } from "@/lib/store/memory";
import type { Job } from "@/lib/types";

const BodySchema = z
  .object({
    fromNumber: z.string(),
    mediaUrl: z.string().url(),
    mimeType: z
      .enum(["image/jpeg", "image/png", "image/webp"])
      .default("image/jpeg"),
  })
  .passthrough();

export async function POST(request: Request): Promise<Response> {
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
      store.appendEvent({
        jobId: job?.id ?? "unknown",
        kind: "visual_triage",
        title: "Visual triage failed",
        detail: String(err),
      });
    }
  })();

  return Response.json({ received: true });
}
