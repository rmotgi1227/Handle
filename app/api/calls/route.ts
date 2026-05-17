import { store } from "@/lib/store/memory";

export async function GET(): Promise<Response> {
  return Response.json({ calls: store.listCalls().slice(0, 20) });
}
