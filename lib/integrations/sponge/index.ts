import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface SpongeClient {
  createInvoice(input: {
    contractorId: string;
    contractorEmail?: string;
    payerEmail: string;
    amountCents: number;
    memo: string;
  }): Promise<{ invoiceId: string; payUrl: string }>;
  getInvoice(invoiceId: string): Promise<{
    status: "draft" | "sent" | "paid" | "failed";
    paidAt?: string;
  }>;
}

export const sponge: SpongeClient = pickImpl<SpongeClient>("sponge", {
  mock: mock.sponge,
  live: live.sponge,
} satisfies AdapterModule<SpongeClient>);
