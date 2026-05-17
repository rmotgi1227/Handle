import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyAgentPhoneWebhook } from "@/lib/integrations/agentphone/webhook-verify";

const SECRET = "whsec_test123";

function sign(timestamp: string, body: string, secret = SECRET): string {
  const h = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `sha256=${h}`;
}

describe("verifyAgentPhoneWebhook", () => {
  it("accepts a valid signature within the 5-min window", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: sign(ts, body),
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: "sha256=" + "0".repeat(64),
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/signature/i);
  });

  it("rejects a timestamp older than 5 minutes", () => {
    const ts = String(Math.floor(Date.now() / 1000) - 400);
    const body = '{"event":"agent.message"}';
    const result = verifyAgentPhoneWebhook({
      rawBody: body,
      signature: sign(ts, body),
      timestamp: ts,
      secret: SECRET,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/timestamp/i);
  });

  it("rejects when secret is missing", () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const result = verifyAgentPhoneWebhook({
      rawBody: "{}",
      signature: sign(ts, "{}"),
      timestamp: ts,
      secret: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/secret/i);
  });
});
