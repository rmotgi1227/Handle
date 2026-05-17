import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyInput {
  rawBody: string;
  signature: string | null | undefined;
  timestamp: string | null | undefined;
  secret: string | null | undefined;
  /** Max clock skew in seconds. Defaults to AgentPhone's 5-minute window. */
  maxAgeSec?: number;
  /** Override for testing — defaults to Date.now()/1000. */
  nowSec?: number;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifyAgentPhoneWebhook(input: VerifyInput): VerifyResult {
  if (!input.secret) return { ok: false, reason: "missing webhook secret" };
  if (!input.signature) return { ok: false, reason: "missing signature header" };
  if (!input.timestamp) return { ok: false, reason: "missing timestamp header" };

  const tsNum = Number.parseInt(input.timestamp, 10);
  if (Number.isNaN(tsNum)) return { ok: false, reason: "invalid timestamp header" };

  const now = input.nowSec ?? Math.floor(Date.now() / 1000);
  const maxAge = input.maxAgeSec ?? 300;
  if (Math.abs(now - tsNum) > maxAge) {
    return { ok: false, reason: "timestamp outside acceptance window" };
  }

  const signed = `${input.timestamp}.${input.rawBody}`;
  const expected = createHmac("sha256", input.secret).update(signed).digest("hex");
  const provided = input.signature.startsWith("sha256=")
    ? input.signature.slice("sha256=".length)
    : input.signature;

  if (provided.length !== expected.length) {
    return { ok: false, reason: "signature length mismatch" };
  }
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature mismatch" };
  }
  return { ok: true };
}
