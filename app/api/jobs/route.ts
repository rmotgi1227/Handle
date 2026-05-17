import { store } from "@/lib/store/memory";

export async function GET(): Promise<Response> {
  return Response.json({ jobs: store.listJobs() });
}
