import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { SupermemoryClient } from "./index";

/**
 * Live Supermemory client — STUB.
 *
 * TODO: wire Supermemory live API — set SUPERMEMORY_API_KEY and
 * SUPERMEMORY_PROJECT_ID, then replace this stub. Per docs (verify
 * before shipping):
 *   - Base URL: https://api.supermemory.ai
 *   - Auth: Authorization: Bearer ${SUPERMEMORY_API_KEY}
 *   - Header: x-project-id: ${SUPERMEMORY_PROJECT_ID}
 *   - POST /v1/memories      → remember
 *   - POST /v1/search        → recall (body { query, topK })
 *
 * Validate every response with Zod before returning.
 */
function notWired(method: string): never {
  if (!env.SUPERMEMORY_API_KEY) {
    throw new IntegrationError(
      "supermemory",
      `SUPERMEMORY_API_KEY missing — cannot call ${method} in live mode. ` +
        `Set SUPERMEMORY_API_KEY (and SUPERMEMORY_PROJECT_ID) or switch INTEGRATION_MODE=mock.`,
    );
  }
  throw new IntegrationError(
    "supermemory",
    `${method} live implementation is a TODO. Wire the real Supermemory API here.`,
  );
}

export const supermemory: SupermemoryClient = {
  async recall(_input) {
    notWired("recall");
  },
  async remember(_input) {
    notWired("remember");
  },
};
