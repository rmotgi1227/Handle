import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { BrowserUseClient } from "./index";

/**
 * Live Browser Use client — STUB.
 *
 * TODO: wire Browser Use live API — set BROWSERUSE_API_KEY and
 * BROWSERUSE_BASE_URL, then replace this stub. Suggested flow:
 *   1. POST `${BROWSERUSE_BASE_URL}/tasks` with a task description like
 *      `Find 5 highly-rated ${trade} contractors in ${city} with phone numbers.`
 *   2. Poll the returned task id until complete.
 *   3. Parse the structured output and validate with Zod before returning.
 *
 * Auth: Authorization: Bearer ${BROWSERUSE_API_KEY}.
 */
function notWired(method: string): never {
  if (!env.BROWSERUSE_API_KEY || !env.BROWSERUSE_BASE_URL) {
    throw new IntegrationError(
      "browseruse",
      `BROWSERUSE_API_KEY / BROWSERUSE_BASE_URL missing — cannot call ${method} in live mode. ` +
        `Set both env vars or switch INTEGRATION_MODE=mock.`,
    );
  }
  throw new IntegrationError(
    "browseruse",
    `${method} live implementation is a TODO. Wire the real Browser Use API here.`,
  );
}

export const browseruse: BrowserUseClient = {
  async findContractors(_input) {
    notWired("findContractors");
  },
};
