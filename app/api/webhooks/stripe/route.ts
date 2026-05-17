import Stripe from "stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver. In the current product, Sponge is the source of
 * truth for "the contractor was paid" — when payContractor runs, it both
 * settles on-chain AND calls invoices.pay(...paid_out_of_band) on Stripe.
 * Stripe then fires invoice.payment_succeeded back to this endpoint, which
 * we acknowledge and ignore (the job is already in `paid` status).
 *
 * Kept as a verified endpoint so the Stripe dashboard doesn't see retry
 * failures, and so the webhook hook can be wired up to future side effects
 * (refunds, disputes) without re-registering in Stripe.
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ received: true });
  }

  const body = await req.text();
  try {
    const client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
    const event = client.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
    console.log("[stripe-webhook]", event.type, (event.data.object as { id?: string }).id);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  return Response.json({ received: true });
}
