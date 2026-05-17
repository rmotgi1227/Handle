import type { StripeClient } from "./index";

function invoiceIdFor(jobId: string, amountCents: number): string {
  let h = 0;
  const seed = `${jobId}|${amountCents}`;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
  return `in_mock_${(h >>> 0).toString(36)}`;
}

const paid = new Set<string>();

export const stripe: StripeClient = {
  async createInvoice({ jobId, amountCents }) {
    const invoiceId = invoiceIdFor(jobId, amountCents);
    return {
      invoiceId,
      hostedUrl: `https://invoice.stripe.com/i/demo/${invoiceId}`,
    };
  },

  async getInvoiceStatus(invoiceId) {
    if (paid.has(invoiceId)) return { status: "paid", paidAt: new Date().toISOString() };
    paid.add(invoiceId);
    return { status: "open" };
  },

  async markInvoicePaidOutOfBand(invoiceId) {
    paid.add(invoiceId);
  },
};
