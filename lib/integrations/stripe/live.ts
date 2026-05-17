import Stripe from "stripe";
import { IntegrationError } from "@/lib/integrations/adapter";
import { requireEnv } from "@/lib/env";
import type { StripeClient, StripeInvoiceResult, StripeInvoiceStatus } from "./index";

function getStripe(): Stripe {
  const key = requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export const stripe: StripeClient = {
  async createInvoice({ ownerEmail, amountCents, description, jobId }): Promise<StripeInvoiceResult> {
    const client = getStripe();

    // Find or create a Stripe customer for this owner email
    const existing = await client.customers.list({ email: ownerEmail, limit: 1 });
    const customer = existing.data[0]
      ? existing.data[0]
      : await client.customers.create({ email: ownerEmail });

    // Create an invoice item
    await client.invoiceItems.create({
      customer: customer.id,
      amount: amountCents,
      currency: "usd",
      description,
    });

    // Create and finalize the invoice
    const invoice = await client.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: 7,
      metadata: { jobId },
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
