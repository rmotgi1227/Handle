import Stripe from "stripe";
import { env } from "@/lib/env";
import { recordOwnerPayment } from "@/lib/orchestrator/actions";

export const runtime = "nodejs";

// Stripe requires the raw body for signature verification — disable body parsing.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return Response.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set");
    return Response.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const client = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" });
    event = client.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const jobId = invoice.metadata?.jobId;

    if (!jobId) {
      console.warn("[stripe-webhook] invoice.payment_succeeded has no jobId in metadata:", invoice.id);
      return Response.json({ received: true });
    }

    const paidAt = invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString();

    try {
      await recordOwnerPayment({ jobId, stripeInvoiceId: invoice.id, paidAt });
    } catch (err) {
      console.error("[stripe-webhook] recordOwnerPayment failed:", err);
      return Response.json({ error: "Failed to record payment" }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
