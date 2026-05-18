import "@/lib/store/bootstrap";
import { z } from "zod";
import { ActionError, createInvoiceForJob } from "@/lib/orchestrator/actions";

const BodySchema = z.object({
  jobId: z.string().min(1),
  amountCents: z.number().int().positive(),
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
    const result = await createInvoiceForJob(body);
    return Response.json(result);
  } catch (err) {
    if (err instanceof ActionError) {
      return Response.json({ error: err.code, detail: err.message }, { status: err.status });
    }
    throw err;
  }
}
