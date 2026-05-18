import "@/lib/store/bootstrap";
import { after } from "next/server";
import { z } from "zod";
import { findContractorsForJob } from "@/lib/orchestrator/run";

export const maxDuration = 60;

const TradeSchema = z.enum([
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "locksmith",
  "pest_control",
  "cleaning",
  "general",
  "roofing",
  "landscaping",
]);

const BodySchema = z.object({
  jobId: z.string().min(1),
  trade: TradeSchema,
  city: z.string().min(1),
});

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
      await findContractorsForJob(body);
    } catch (err) {
      console.error(`[contractors/find] find failed for job=${body.jobId}:`, err);
    }
  });

  return Response.json({ queued: true, jobId: body.jobId });
}
