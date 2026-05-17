import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface StripeInvoiceResult {
  invoiceId: string;
  hostedUrl: string;
}

export interface StripeInvoiceStatus {
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  paidAt?: string;
}

export interface StripeClient {
  createInvoice(input: {
    ownerEmail: string;
    amountCents: number;
    description: string;
    jobId: string;
  }): Promise<StripeInvoiceResult>;

  getInvoiceStatus(invoiceId: string): Promise<StripeInvoiceStatus>;

  /**
   * Mark a Stripe invoice as paid via an out-of-band rail (Sponge in our case).
   * The on-chain settlement is the real payment; this just keeps Stripe's
   * record-keeping in sync so the invoice shows "Paid" in the dashboard.
   */
  markInvoicePaidOutOfBand(invoiceId: string): Promise<void>;
}

export const stripe: StripeClient = pickImpl<StripeClient>("stripe", {
  mock: mock.stripe,
  live: live.stripe,
} satisfies AdapterModule<StripeClient>);
