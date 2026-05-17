import type { SpongeClient } from "./index";

/**
 * Deterministic Sponge mock.
 * - createInvoice returns a stable invoiceId derived from input.
 * - getInvoice returns `sent` on first lookup, `paid` on the second+ lookup
 *   (per the v1 plan — invoice transitions to paid on second poll).
 */

function invoiceIdFor(input: {
  contractorId: string;
  payerEmail: string;
  amountCents: number;
  memo: string;
}): string {
  const seed = `${input.contractorId}|${input.payerEmail}|${input.amountCents}|${input.memo}`;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 33 + seed.charCodeAt(i)) | 0;
  }
  return `inv_${(h >>> 0).toString(36)}`;
}

const lookups = new Map<string, number>();
// Deterministic paid-at timestamp so demos and tests are reproducible.
const PAID_AT = "2026-05-17T09:30:00.000Z";

export const sponge: SpongeClient = {
  async createInvoice(input) {
    const invoiceId = invoiceIdFor(input);
    lookups.set(invoiceId, 0);
    return {
      invoiceId,
      payUrl: `https://demo.sponge.test/pay/${invoiceId}`,
    };
  },

  async getInvoice(invoiceId) {
    const prev = lookups.get(invoiceId) ?? 0;
    const next = prev + 1;
    lookups.set(invoiceId, next);
    if (next >= 2) {
      return { status: "paid", paidAt: PAID_AT };
    }
    return { status: "sent" };
  },
};
