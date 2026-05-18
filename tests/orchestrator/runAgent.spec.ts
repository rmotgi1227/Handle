/**
 * Behavior tests for `runAgent` — the end-to-end orchestrator loop.
 *
 * These tests exercise real decision points (intent → pool → dial race →
 * assignment / manual routing) against the in-process mock adapters. The
 * dial path is webhook-driven post-refactor (28625d6), so we simulate the
 * AgentPhone outbound webhook by writing the outcome to
 * `store.contractorCalls` after `placeOutboundCall` resolves — that's
 * exactly what /api/calls/outbound does in production.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

// Force every integration into mock mode BEFORE the store/orchestrator import,
// otherwise zod parses NODE_ENV-driven defaults and pickImpl resolves with
// stale values.
process.env.INTEGRATION_MODE = "mock";
process.env.AGENTPHONE_MODE = "mock";
process.env.GEMINI_MODE = "mock";
process.env.MOSS_MODE = "mock";
process.env.SUPERMEMORY_MODE = "mock";
process.env.BROWSERUSE_MODE = "mock";

import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";
import { runAgent } from "@/lib/orchestrator/run";
import { agentphone } from "@/lib/integrations/agentphone";
import { supermemory } from "@/lib/integrations/supermemory";
import { seedRetrievalOnce } from "@/lib/store/seed-retrieval";
import type { CallTranscriptLine, ContractorCallOutcome } from "@/lib/types";

/**
 * Wire up `placeOutboundCall` so that for every dial it writes a synthetic
 * outbound-webhook outcome into `store.contractorCalls` shortly after the
 * call placeholder is written. This mirrors what /api/calls/outbound does
 * in production. Pass `acceptIf` to control which contractors "accept" —
 * everyone else writes `declined` so Promise.any can race.
 */
type SimDecision =
  | {
      outcome: ContractorCallOutcome;
      quotedPriceCents?: number;
      etaWindow?: string;
    }
  | "timeout";

const DEFAULT_ACCEPT: SimDecision = {
  outcome: "accepted_job",
  quotedPriceCents: 18000,
  etaWindow: "today 3–5pm",
};

function wireWebhookSimulator(opts: {
  /** Return a SimDecision for the given contractor, or "timeout" to skip
   * writing any outcome (which exercises the dial timeout path). */
  outcomeForContractor?: (contractorId: string) => SimDecision;
  /** Delay before writing the outcome. Real webhooks are async — we mimic that
   * with setTimeout so the dial's placeholder write completes first. */
  delayMs?: number;
} = {}) {
  const original = agentphone.placeOutboundCall.bind(agentphone);
  return vi.spyOn(agentphone, "placeOutboundCall").mockImplementation(async (input) => {
    const result = await original(input);
    const contractorId = input.metadata?.contractorId;
    const decision: SimDecision | null = contractorId
      ? opts.outcomeForContractor
        ? opts.outcomeForContractor(contractorId)
        : DEFAULT_ACCEPT
      : null;

    if (decision && decision !== "timeout") {
      // Defer slightly so dialContractorForJob's placeholder set runs first
      // (we don't want to clobber our outcome with the placeholder).
      setTimeout(() => {
        const rec = store.contractorCalls.get(result.callId);
        if (!rec) return;
        store.contractorCalls.set(result.callId, {
          ...rec,
          endedAt: new Date().toISOString(),
          outcome: decision.outcome,
          quotedPriceCents: decision.quotedPriceCents,
          etaWindow: decision.etaWindow,
          transcriptSummary: `simulated ${decision.outcome}`,
        });
      }, opts.delayMs ?? 10);
    }
    return result;
  });
}

/** Build a Call row the orchestrator can pick up, with a fixed transcript. */
function seedCall(args: {
  id: string;
  fromNumber: string;
  callerId: string;
  propertyId: string;
  transcript: string[];
}): void {
  const now = new Date().toISOString();
  const lines: CallTranscriptLine[] = args.transcript.map((text, i) => ({
    at: new Date(Date.parse(now) + i * 1000).toISOString(),
    speaker: i % 2 === 0 ? "agent" : "caller",
    text,
  }));
  store.upsertCall({
    id: args.id,
    fromNumber: args.fromNumber,
    callerId: args.callerId,
    callerRole: "tenant",
    propertyId: args.propertyId,
    status: "in_progress",
    startedAt: now,
    transcript: lines,
  });
}

beforeAll(async () => {
  // Push contractors into Moss + Supermemory history into the mock supermemory
  // store. Needed for the moss-first contractor pool path.
  await seedRetrievalOnce();
});

beforeEach(() => {
  // Each test gets a fresh transcript spy so fetchTranscript can't override
  // our carefully crafted call.transcript.
  vi.spyOn(agentphone, "fetchTranscript").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runAgent — tenant call → contractor assignment", () => {
  it("plumbing call: classifies → pool → dials → assigns winner → scheduled", async () => {
    seedCall({
      id: "call_test_plumb_1",
      fromNumber: "+14155551410",
      callerId: "person_tenant_1",
      propertyId: "prop_1",
      transcript: [
        "agent: hi what's going on",
        "caller: I have a kitchen leak under the sink and there's water on the floor",
        "agent: ok how long has it been leaking",
        "caller: about thirty minutes, it's not stopping",
      ],
    });

    wireWebhookSimulator();

    const result = await runAgent({ callId: "call_test_plumb_1" });

    expect(result.contractorId).not.toBeNull();
    const job = store.getJob(result.jobId)!;
    expect(job.trade).toBe("plumbing");
    expect(job.status).toBe("scheduled");
    expect(job.assignedContractorId).toBe(result.contractorId);

    const events = store.listJobEvents(job.id);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain("intent_classified");
    expect(kinds).toContain("contractor_search_completed");
    expect(kinds.filter((k) => k === "contractor_dial_started").length).toBeGreaterThanOrEqual(1);
    expect(kinds).toContain("contractor_assigned");

    // The pool should have come from the moss-first path (≥3 hits).
    const search = events.find((e) => e.kind === "contractor_search_completed");
    expect(search?.data?.source).toBe("moss");
  });

  it("lockout call: classifies as locksmith → pool → assigns winner", async () => {
    seedCall({
      id: "call_test_lockout_1",
      fromNumber: "+14155551420",
      callerId: "person_tenant_3",
      propertyId: "prop_1",
      transcript: [
        "agent: hi what's going on",
        "caller: I'm locked out of my apartment, I left the key inside",
        "agent: noted",
        "caller: please send a locksmith asap",
      ],
    });

    wireWebhookSimulator();

    const result = await runAgent({ callId: "call_test_lockout_1" });

    expect(result.contractorId).not.toBeNull();
    const job = store.getJob(result.jobId)!;
    expect(job.trade).toBe("locksmith");
    expect(job.status).toBe("scheduled");
    expect(job.assignedContractorId).toBe(result.contractorId);
  });

  it("non-matching content → routes to needs_manual_routing with routing_failed", async () => {
    seedCall({
      id: "call_test_unknown_1",
      fromNumber: "+14155551421",
      callerId: "person_tenant_4",
      propertyId: "prop_1",
      transcript: [
        "agent: hi",
        "caller: I just wanted to say hello to my landlord, nothing wrong",
        "agent: ok",
        "caller: please thank Priya for the welcome basket whenever you can",
      ],
    });

    // Trade falls back to "general". In the seeded retrieval data there are
    // only a couple of general contractors — enough that there IS a pool.
    // To force `routing_failed`, make EVERY dial decline so Promise.any
    // rejects.
    wireWebhookSimulator({
      outcomeForContractor: () => ({ outcome: "declined" as const }),
    });

    const result = await runAgent({ callId: "call_test_unknown_1" });

    expect(result.contractorId).toBeNull();
    const job = store.getJob(result.jobId)!;
    expect(job.status).toBe("needs_manual_routing");

    const events = store.listJobEvents(job.id);
    expect(events.some((e) => e.kind === "routing_failed")).toBe(true);
  });

  it("past tenant satisfaction ≤2 → contractor skipped (event emitted)", async () => {
    // Pick a real ctr_id from the seeded directory that would normally be in
    // the pool. ctr_seed_007 = Marina Electric, an electrical contractor.
    // We record a 2/5 survey for them, then run an electrical call.
    await supermemory.remember({
      text: `survey_response contractor ctr_seed_007 electrical property prop_1. Tenant satisfaction score: 2/5. Feedback: showed up late, work was sloppy.`,
      tags: ["survey_response", "contractor:ctr_seed_007", "property:prop_1", "trade:electrical"],
      metadata: { contractorId: "ctr_seed_007", propertyId: "prop_1", trade: "electrical", score: 2 },
    });

    seedCall({
      id: "call_test_skip_1",
      fromNumber: "+14155551422",
      callerId: "person_tenant_5",
      propertyId: "prop_1",
      transcript: [
        "agent: hi",
        "caller: my outlet is sparking and I lost power on that wall",
        "agent: noted",
        "caller: the breaker won't reset either",
      ],
    });

    wireWebhookSimulator();

    const result = await runAgent({ callId: "call_test_skip_1" });

    // Winner should not be the low-satisfaction contractor.
    expect(result.contractorId).not.toBe("ctr_seed_007");

    const events = store.listJobEvents(result.jobId);
    const skipped = events.find(
      (e) =>
        e.kind === "contractor_skipped" &&
        (e.data?.contractorId as string | undefined) === "ctr_seed_007",
    );
    // The skip event is emitted only if ctr_seed_007 was actually in the
    // candidate pool. With the moss seed in place it should be — assert that.
    expect(skipped).toBeDefined();
    expect(skipped?.data?.score).toBe(2);
  });

  it("all dialed contractors time out → routing_failed", async () => {
    seedCall({
      id: "call_test_timeout_1",
      fromNumber: "+14155551431",
      callerId: "person_tenant_7",
      propertyId: "prop_2",
      transcript: [
        "agent: hi",
        "caller: my AC is broken and it's 95 inside",
        "agent: noted",
        "caller: my window unit won't come on",
      ],
    });

    // No webhook outcome ever lands for any dial.
    wireWebhookSimulator({ outcomeForContractor: () => "timeout" });

    // Fake timers let us blow past the 90s waitForDialOutcome deadline in ms.
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });

    try {
      const promise = runAgent({ callId: "call_test_timeout_1" });
      // Drive the polling loop past its deadline.
      await vi.advanceTimersByTimeAsync(95_000);
      const result = await promise;

      expect(result.contractorId).toBeNull();
      const job = store.getJob(result.jobId)!;
      expect(job.status).toBe("needs_manual_routing");

      const events = store.listJobEvents(job.id);
      expect(events.some((e) => e.kind === "routing_failed")).toBe(true);
      // Each dial should have emitted a "no answer (timeout)" outcome event.
      const timeouts = events.filter(
        (e) =>
          e.kind === "contractor_dial_outcome" &&
          (e.data?.source as string | undefined) === "dial_timeout",
      );
      expect(timeouts.length).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  }, 20_000);
});
