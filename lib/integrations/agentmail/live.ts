import { IntegrationError } from "@/lib/integrations/adapter";
import { env } from "@/lib/env";
import type { AgentMailClient } from "./index";

/**
 * Live AgentMail client — STUB.
 *
 * TODO: wire AgentMail live API — set AGENTMAIL_API_KEY and
 * AGENTMAIL_INBOX, then replace this stub. Expected request:
 *   POST https://api.agentmail.to/v1/messages
 *   Authorization: Bearer ${AGENTMAIL_API_KEY}
 *   { from: AGENTMAIL_INBOX, to, subject, text, html?, tags? }
 *   → { id: string }
 *
 * Validate the response with Zod and return { messageId: id }.
 */
function notWired(method: string): never {
  if (!env.AGENTMAIL_API_KEY || !env.AGENTMAIL_INBOX) {
    throw new IntegrationError(
      "agentmail",
      `AGENTMAIL_API_KEY / AGENTMAIL_INBOX missing — cannot call ${method} in live mode. ` +
        `Set both env vars or switch INTEGRATION_MODE=mock.`,
    );
  }
  throw new IntegrationError(
    "agentmail",
    `${method} live implementation is a TODO. Wire the real AgentMail API here.`,
  );
}

export const agentmail: AgentMailClient = {
  async sendEmail(_input) {
    notWired("sendEmail");
  },
};
