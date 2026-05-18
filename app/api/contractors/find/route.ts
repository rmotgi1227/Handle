import "@/lib/store/bootstrap";
import { z } from "zod";
import { findContractorsForJob } from "@/lib/orchestrator/run";

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

  try {
    const result = await findContractorsForJob(body);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: "find contractors failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
