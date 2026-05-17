import { IntegrationError } from "@/lib/integrations/adapter";
import { requireEnv } from "@/lib/env";
import type { SpongeClient, SpongeBalance, SpongePayResult, SpongeTxStatus } from "./index";

const MCP_URL = "https://api.wallet.paysponge.com/mcp";
const CHAIN = "solana";
const TOKEN = "USDC";

async function mcpInit(apiKey: string): Promise<string> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "handle-dispatc", version: "1.0" },
      },
    }),
  });
  const sessionId = res.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new IntegrationError("sponge", "No Mcp-Session-Id in initialize response");
  }
  return sessionId;
}

async function mcpToolCall(
  apiKey: string,
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${apiKey}`,
      "Mcp-Session-Id": sessionId,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  const envelope = await res.json() as {
    result?: { content: Array<{ type: string; text: string }> };
    error?: { code: number; message: string };
  };

  if (envelope.error) {
    throw new IntegrationError("sponge", `MCP error ${envelope.error.code}: ${envelope.error.message}`);
  }

  const text = envelope.result?.content?.[0]?.text;
  if (!text) throw new IntegrationError("sponge", `Empty MCP response from ${toolName}`);
  return JSON.parse(text);
}

async function call(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = requireEnv("SPONGE_API_KEY");
  const sessionId = await mcpInit(apiKey);
  return mcpToolCall(apiKey, sessionId, toolName, args);
}

export const sponge: SpongeClient = {
  async checkBalance(): Promise<SpongeBalance> {
    const result = await call("get_balance", { chain: CHAIN }) as Record<string, {
      address: string;
      balances: Array<{ token: string; amount: string }>;
    }>;
    const chainData = result[CHAIN];
    if (!chainData) throw new IntegrationError("sponge", `No balance data for chain ${CHAIN}`);
    const usdcEntry = chainData.balances.find((b) => b.token === TOKEN);
    return {
      address: chainData.address,
      usdc: usdcEntry ? parseFloat(usdcEntry.amount) : 0,
    };
  },

  async payContractor({ toAddress, amountUsdc, memo }): Promise<SpongePayResult> {
    const result = await call("transfer", {
      chain: CHAIN,
      to: toAddress,
      amount: amountUsdc.toString(),
      token: TOKEN,
      ...(memo ? { data: memo } : {}),
    }) as Record<string, unknown>;

    // Sponge MCP returns `transactionHash` (camelCase); accept other casings defensively.
    const txnHash = (result.transactionHash ?? result.txid ?? result.signature ?? result.hash ?? result.transaction_hash) as string | undefined;
    if (!txnHash) {
      throw new IntegrationError("sponge", `transfer succeeded but no txnHash in response: ${JSON.stringify(result)}`);
    }
    const explorerUrl = (result.explorerUrl ?? result.explorer_url) as string | undefined;
    return { txnHash, explorerUrl };
  },

  async getTransactionStatus(txnHash: string): Promise<SpongeTxStatus> {
    const result = await call("get_transaction_status", {
      transaction_hash: txnHash,
      chain: CHAIN,
    }) as { status?: string; confirmed?: boolean };

    const raw = result.status?.toLowerCase();
    if (raw === "confirmed" || result.confirmed === true) return { status: "confirmed" };
    if (raw === "failed" || raw === "error") return { status: "failed" };
    return { status: "pending" };
  },
};
