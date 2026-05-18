import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env, requireEnv } from "@/lib/env";
import type { AgentMailClient } from "./index";

/**
 * Live AgentMail client.
 *
 * Endpoint: POST https://api.agentmail.to/v0/inboxes/{inbox_id}/messages/send
 * Auth:     Bearer ${AGENTMAIL_API_KEY}
 * Body:     { to, subject, text, html?, cc?, bcc?, reply_to?, labels? }
 * 200:      { message_id, thread_id, inbox_id, subject, to }
 *
 * Mock impl is the demo-safe path — flip AGENTMAIL_MODE=live in .env.local
 * (with AGENTMAIL_API_KEY + AGENTMAIL_INBOX set) to hit the real API.
 */

const SendResponseSchema = z
  .object({
    message_id: z.string().min(1),
    thread_id: z.string().optional(),
    inbox_id: z.string().optional(),
  })
  .passthrough();

export const agentmail: AgentMailClient = {
  async sendEmail(input) {
    if (!env.AGENTMAIL_INBOX) {
      throw new IntegrationError(
        "agentmail",
        "AGENTMAIL_INBOX missing — set it to the inbox you're sending from (e.g. nicolas-5966@agentmail.to).",
      );
    }
    const apiKey = requireEnv("AGENTMAIL_API_KEY");
    const inboxId = env.AGENTMAIL_INBOX;

    const body: Record<string, unknown> = {
      to: input.to,
      subject: input.subject,
      text: input.text,
    };
    if (input.html) body.html = input.html;
    // AgentMail calls them `labels`; our interface still uses `tags` for
    // continuity with other adapters. Translate at the boundary.
    if (input.tags?.length) body.labels = input.tags;

    const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (cause) {
      throw new IntegrationError("agentmail", "sendEmail network error", cause);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "(no body)");
      throw new IntegrationError(
        "agentmail",
        `sendEmail ${res.status} ${res.statusText}: ${detail}`,
      );
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch (cause) {
      throw new IntegrationError("agentmail", "sendEmail: non-JSON response", cause);
    }
    const parsed = SendResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new IntegrationError(
        "agentmail",
        `sendEmail: schema validation failed: ${parsed.error.message}`,
      );
    }
    return { messageId: parsed.data.message_id };
  },
};
