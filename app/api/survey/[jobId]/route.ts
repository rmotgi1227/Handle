import { z } from "zod";
import { ActionError, recordSurveyResponse } from "@/lib/orchestrator/actions";

const BodySchema = z.object({
  score: z.number().int().min(1).max(5),
  feedback: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const { jobId } = await params;
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
    const result = await recordSurveyResponse({ jobId, ...body });
    return Response.json(result);
  } catch (err) {
    if (err instanceof ActionError) {
      return Response.json({ error: err.code, detail: err.message }, { status: err.status });
    }
    throw err;
  }
}
