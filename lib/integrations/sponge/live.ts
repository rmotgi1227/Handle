import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { SpongeClient } from "./index";

/**
 * Live Sponge client — STUB.
 *
 * TODO: wire Sponge live API — set SPONGE_API_KEY (and SPONGE_ACCOUNT_ID),
 * then replace this stub. Endpoints pending Sponge API docs from teammates.
 * Expected shape:
 *   - POST /invoices  → { id, hosted_url }      → createInvoice
 *   - GET  /invoices/:id → { status, paid_at? } → getInvoice
 * Auth: Authorization: Bearer ${SPONGE_API_KEY}, X-Account-Id: ${SPONGE_ACCOUNT_ID}.
 *
 * Validate every response with Zod at the boundary.
 */
function notWired(method: string): never {
  if (!env.SPONGE_API_KEY) {
    throw new IntegrationError(
      "sponge",
      `SPONGE_API_KEY missing — cannot call ${method} in live mode. ` +
        `Set SPONGE_API_KEY (and SPONGE_ACCOUNT_ID) or switch INTEGRATION_MODE=mock.`,
    );
  }
  throw new IntegrationError(
    "sponge",
    `${method} live implementation is a TODO. Wire the real Sponge API here.`,
  );
}

export const sponge: SpongeClient = {
  async createInvoice(_input) {
    notWired("createInvoice");
  },
  async getInvoice(_invoiceId) {
    notWired("getInvoice");
  },
};
