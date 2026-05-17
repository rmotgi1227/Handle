import { store } from "@/lib/store/memory";

export async function GET(): Promise<Response> {
  return Response.json({ contractors: store.listContractors() });
}
