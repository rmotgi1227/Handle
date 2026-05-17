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
}

export const stripe: StripeClient = pickImpl<StripeClient>("stripe", {
  mock: mock.stripe,
  live: live.stripe,
} satisfies AdapterModule<StripeClient>);
