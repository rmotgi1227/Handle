import type { AgentPhoneClient } from "./index";

/**
 * Deterministic mock for AgentPhone. Designed for demo recording.
 * - IDs are derived from input so repeated calls in tests are stable.
 * - Transcripts are crafted to feed sensible Gemini classifications.
 */

const FIXED_NOW = "2026-05-17T09:00:00.000Z";

// Counter for deterministic-ish unique IDs within a single process run.
// We seed off input where possible; this counter is only used when input
// cannot produce a unique fingerprint.
let outboundSeq = 0;

function callIdFor(prefix: string, seed: string): string {
  // Cheap stable hash → hex slice. Avoids randomness while staying readable.
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  const hex = (h >>> 0).toString(16).padStart(8, "0");
  return `${prefix}_${hex}`;
}

/**
 * Transcript fixtures keyed by a fingerprint of the inbound call ID.
 * For demo: rotate through a small library of plausible tenant complaints.
 */
const TRANSCRIPT_LIBRARY: Record<string, Array<{ speaker: "caller" | "agent"; text: string }>> = {
  default: [
    { speaker: "agent", text: "Thanks for calling. What's going on at your unit?" },
    { speaker: "caller", text: "There's water leaking under my kitchen sink, it's getting on the floor." },
    { speaker: "agent", text: "Got it. How long has it been leaking?" },
    { speaker: "caller", text: "About an hour. It's not slowing down." },
    { speaker: "agent", text: "Understood — I'll dispatch a plumber right away." },
  ],
  electrical: [
    { speaker: "agent", text: "Thanks for calling. What's going on?" },
    { speaker: "caller", text: "Half the apartment has no power and the breaker won't reset." },
    { speaker: "agent", text: "I'll get an electrician out to you tonight." },
  ],
  hvac: [
    { speaker: "agent", text: "Thanks for calling. What's going on?" },
    { speaker: "caller", text: "The AC stopped working and it's 95 degrees inside." },
    { speaker: "agent", text: "I'll dispatch HVAC right away." },
  ],
};

export const agentphone: AgentPhoneClient = {
  async parseInboundWebhook(req) {
    // Accept either a JSON body the test/seed flow posts, or fall back to a
    // deterministic default. We never throw in mock mode.
    let body: Record<string, unknown> = {};
    try {
      body = (await req.clone().json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const fromNumber =
      typeof body.fromNumber === "string" ? body.fromNumber : "+14155550100";
    const startedAt =
      typeof body.startedAt === "string" ? body.startedAt : FIXED_NOW;
    const seed = `${fromNumber}|${startedAt}`;
    const callId = callIdFor("call", seed);
    return { callId, fromNumber, startedAt };
  },

  async fetchTranscript(callId) {
    // Rotate through the library by hash bucket of the callId. Deterministic,
    // gives diverse demo coverage without the previous bug where any callId
    // containing 'e' or 'h' (i.e. nearly every hex id) collapsed to one variant.
    const variants: Array<keyof typeof TRANSCRIPT_LIBRARY> = ["default", "electrical", "hvac"];
    let h = 0;
    for (let i = 0; i < callId.length; i += 1) h = (h * 31 + callId.charCodeAt(i)) | 0;
    const variant = variants[(h >>> 0) % variants.length];
    const base = TRANSCRIPT_LIBRARY[variant];
    const start = Date.parse(FIXED_NOW);
    return base.map((line, idx) => ({
      at: new Date(start + idx * 8_000).toISOString(),
      speaker: line.speaker,
      text: line.text,
    }));
  },

  async placeOutboundCall(input) {
    outboundSeq += 1;
    // Brief await to mimic network latency (~no-op for tests).
    await new Promise((r) => setTimeout(r, 1));
    const seed = `${input.toNumber}|${outboundSeq}`;
    return { callId: callIdFor("ocall", seed) };
  },

  async sendSms(input) {
    const messageId = callIdFor("sms", `${input.to}|${input.body}`);
    if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
      // eslint-disable-next-line no-console
      console.log(`[agentphone:mock] sms → ${input.to} :: ${input.body.slice(0, 80)}...`);
    }
    return { messageId };
  },
};
