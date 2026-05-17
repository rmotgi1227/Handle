import type { SpongeClient } from "./index";

const DEMO_ADDRESS = "AzSqf7aAND7iwjFyPqakki7XQ5ogMwSxqhp3cmGCvvcU";

function fakeTxHash(toAddress: string, amountUsdc: number): string {
  let h = 0;
  const seed = `${toAddress}|${amountUsdc}|${Date.now()}`;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) | 0;
  return `mock_tx_${(h >>> 0).toString(36)}`;
}

export const sponge: SpongeClient = {
  async checkBalance() {
    return { address: DEMO_ADDRESS, usdc: 5.0 };
  },

  async payContractor({ toAddress, amountUsdc }) {
    return { txnHash: fakeTxHash(toAddress, amountUsdc) };
  },

  async getTransactionStatus(_txnHash) {
    return { status: "confirmed" };
  },
};
