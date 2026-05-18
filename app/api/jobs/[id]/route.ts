import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const job = store.getJob(id);
  if (!job) {
    return Response.json({ error: "job not found" }, { status: 404 });
  }
  const events = store.listJobEvents(id);
  return Response.json({ job, events });
}
