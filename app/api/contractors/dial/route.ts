import { z } from "zod";
import { dialContractorForJob } from "@/lib/orchestrator/run";

const BodySchema = z.object({
  jobId: z.string().min(1),
  contractorId: z.string().min(1),
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

  try {
    const result = await dialContractorForJob(body);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: "dial failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
