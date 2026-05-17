import { z } from "zod";
import { runAgent } from "@/lib/orchestrator/run";

const BodySchema = z.object({
  callId: z.string().min(1),
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
    const result = await runAgent(body);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: "Orchestrator failed", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
