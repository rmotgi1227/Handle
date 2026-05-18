/**
 * Allowlist of phone numbers permitted to reach the Handle agent line.
 * Calls from any other `from` number are dropped at the webhook boundary in
 * `app/api/calls/incoming/route.ts` — the agent never picks up, the in-memory
 * store stays clean, and the orchestrator is never invoked.
 *
 * Stored in E.164 (`+CCDDDDDDDDDD`). Update this set to add more callers.
 */
const ALLOWED_NUMBERS: ReadonlySet<string> = new Set([
  "+19853381645", // 985 338 1645
  "+16198974800", // (619) 897-4800
  "+14079214601", // (407) 921-4601
]);

/**
 * Normalize a phone number to E.164. Accepts a handful of common shapes —
 * `+1...`, `1...`, `(xxx) xxx-xxxx`, `xxx-xxx-xxxx`, `xxx xxx xxxx`. Anything
 * else is returned as `+<digits>` so the comparison just misses cleanly.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

export function isCallerAllowed(rawFromNumber: string | undefined | null): boolean {
  if (!rawFromNumber) return false;
  return ALLOWED_NUMBERS.has(normalizePhone(rawFromNumber));
}
