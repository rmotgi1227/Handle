import "@/lib/store/bootstrap";
import { sponge } from "@/lib/integrations/sponge";

export async function GET(): Promise<Response> {
  try {
    const balance = await sponge.checkBalance();
    return Response.json({ ok: true, balance });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: "wallet_unavailable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}
