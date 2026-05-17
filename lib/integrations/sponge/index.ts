import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface SpongeBalance {
  address: string;
  usdc: number;
}

export interface SpongePayResult {
  txnHash: string;
  explorerUrl?: string;
}

export interface SpongeTxStatus {
  status: "confirmed" | "pending" | "failed";
}

export interface SpongeClient {
  checkBalance(): Promise<SpongeBalance>;
  payContractor(input: {
    toAddress: string;
    amountUsdc: number;
    memo?: string;
  }): Promise<SpongePayResult>;
  getTransactionStatus(txnHash: string): Promise<SpongeTxStatus>;
}

export const sponge: SpongeClient = pickImpl<SpongeClient>("sponge", {
  mock: mock.sponge,
  live: live.sponge,
} satisfies AdapterModule<SpongeClient>);
