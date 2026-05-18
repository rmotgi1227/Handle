import type { AgentMailClient } from "./index";

/**
 * Deterministic AgentMail mock. Logs the send and returns a stable
 * messageId derived from the recipient + subject + text.
 *
 * Logging is gated to skip noise in vitest runs.
 */

let seq = 0;

function messageIdFor(input: { to: string; subject: string; text: string }): string {
  const seed = `${input.to}|${input.subject}|${input.text}`;
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 41 + seed.charCodeAt(i)) | 0;
  }
  return `msg_${(h >>> 0).toString(36)}`;
}

export const agentmail: AgentMailClient = {
  async sendEmail(input) {
    seq += 1;
    const messageId = messageIdFor(input);
    if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
      console.log(
        `[agentmail:mock] #${seq} → ${input.to} :: ${input.subject} (${messageId})`,
      );
    }
    return { messageId };
  },
};
