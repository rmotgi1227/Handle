import Stripe from "stripe";
import { IntegrationError } from "@/lib/integrations/adapter";
import { requireEnv } from "@/lib/env";
import type { StripeClient, StripeInvoiceResult, StripeInvoiceStatus } from "./index";

function getStripe(): Stripe {
  const key = requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export const stripe: StripeClient = {
  async createInvoice({ ownerEmail, ownerName, amountCents, description, jobId, metadata, footer }): Promise<StripeInvoiceResult> {
    const client = getStripe();

    // Find or create a Stripe customer for this owner email; backfill the name
    // so the invoice header reads "Bill to: Priya Kapoor" instead of just an email.
    const existing = await client.customers.list({ email: ownerEmail, limit: 1 });
    let customer = existing.data[0];
    if (!customer) {
      customer = await client.customers.create({ email: ownerEmail, name: ownerName });
    } else if (ownerName && !customer.name) {
      customer = await client.customers.update(customer.id, { name: ownerName });
    }

    await client.invoiceItems.create({
      customer: customer.id,
      amount: amountCents,
      currency: "usd",
      description,
    });

    const invoice = await client.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 7,
      metadata: { jobId, ...metadata },
      footer: footer ?? "Settled via Sponge — USDC on Solana. Receipt mirrored to AgentMail.",
      auto_advance: true,
    });

    const finalized = await client.invoices.finalizeInvoice(invoice.id);

    if (!finalized.hosted_invoice_url) {
      throw new IntegrationError("stripe", `Invoice ${finalized.id} has no hosted URL after finalization`);
    }

    return {
      invoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url,
    };
  },

  async getInvoiceStatus(invoiceId): Promise<StripeInvoiceStatus> {
    const client = getStripe();
    const invoice = await client.invoices.retrieve(invoiceId);
    return {
      status: invoice.status ?? "draft",
      paidAt: invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
        : undefined,
    };
  },

  async markInvoicePaidOutOfBand(invoiceId): Promise<void> {
    const client = getStripe();
    await client.invoices.pay(invoiceId, { paid_out_of_band: true });
  },
};
