import "@/lib/store/bootstrap";
import { after } from "next/server";
import { z } from "zod";
import { dialContractorForJob } from "@/lib/orchestrator/run";

export const maxDuration = 60;

const BodySchema = z.object({
  jobId: z.string().min(1),
  contractorId: z.string().min(1),
});

/**
 * Places an outbound contractor call and returns immediately. The actual
 * dial (Gemini script draft + AgentPhone outbound + transcript polling)
 * runs detached via `after()` so the request returns in <1s instead of
 * blocking on a multi-second SDK call — same pattern /api/calls/incoming
 * uses for runAgent. Without this the route hits Vercel's serverless
 * function timeout and Vercel serves its static /500.html before our
 * route handler can return JSON.
 */
export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "Invalid body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  after(async () => {
    try {
      await dialContractorForJob(body);
    } catch (err) {
      console.error(`[contractors/dial] dial failed for job=${body.jobId} contractor=${body.contractorId}:`, err);
    }
  });

  return Response.json({
    queued: true,
    jobId: body.jobId,
    contractorId: body.contractorId,
  });
}
