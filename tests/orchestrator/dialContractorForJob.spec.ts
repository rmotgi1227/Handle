/**
 * Behavior tests for `dialContractorForJob` — the single-contractor dial that
 * blocks on a webhook-driven outcome (refactor 28625d6). We assert the three
 * decision points:
 *  1. Placing a dial writes a PENDING ContractorCall + a dial_started event.
 *  2. A webhook write upgrades the PENDING row + emits a dial_outcome event.
 *  3. No webhook within the timeout → degraded no_answer + timeout event.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

process.env.INTEGRATION_MODE = "mock";
process.env.AGENTPHONE_MODE = "mock";
process.env.GEMINI_MODE = "mock";
process.env.MOSS_MODE = "mock";
process.env.SUPERMEMORY_MODE = "mock";

import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";
import { dialContractorForJob } from "@/lib/orchestrator/run";
import { agentphone } from "@/lib/integrations/agentphone";
import { POST as outboundWebhookPOST } from "@/app/api/calls/outbound/route";
import type { NegotiationContext } from "@/lib/integrations/agentphone";

const NEG_CTX: NegotiationContext = {
  job: {
    trade: "plumbing",
    urgency: "urgent",
    address: "342 Valencia St",
    unit: "3B",
    description: "Kitchen leak under sink",
  },
  pricing: {
    targetCents: 18000,
    walkAwayCents: 28000,
    marketContext: "SF plumbing routine $150-$250",
    competitorAnchors: [
      { contractorName: "AcmePlumb", amountCents: 21500, whenAgo: "1 month ago" },
    ],
  },
  contractor: {
    name: "Roto-Rooter SF",
    history: "No prior jobs with Roto-Rooter SF on file. Public rating 4.3/5.",
  },
  timeline: "Today if at all possible",
};

function seedTestJob(opts: { jobId: string; contractorId?: string }) {
  return store.upsertJob({
    id: opts.jobId,
    propertyId: "prop_1",
    reportedByPersonId: "person_tenant_1",
    trade: "plumbing",
    urgency: "urgent",
    title: "Kitchen leak",
    description: "Tenant reports a leak under the kitchen sink",
  });
}

beforeEach(() => {
  // Don't let the seeded library text override anything our test cares about.
  vi.spyOn(agentphone, "fetchTranscript").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dialContractorForJob — webhook-driven outcomes", () => {
  it("placing a dial writes a PENDING ContractorCall and a dial_started event with anchors", async () => {
    const job = seedTestJob({ jobId: "job_dial_test_pending" });
    const contractorId = "ctr_6"; // Roto-Rooter SF, seeded

    // Intercept placeOutboundCall: do NOT write any outcome (so the dial
    // would block forever on waitForDialOutcome). We're inspecting the
    // PENDING state, so we run the dial in a background promise and
    // assert state right after the placeholder is set.
    const origPlace = agentphone.placeOutboundCall.bind(agentphone);
    let capturedNegotiation: NegotiationContext | undefined;
    vi.spyOn(agentphone, "placeOutboundCall").mockImplementation(async (input) => {
      capturedNegotiation = input.negotiationContext;
      return origPlace(input);
    });

    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });
    try {
      const dialPromise = dialContractorForJob({
        jobId: job.id,
        contractorId,
        negotiationContext: NEG_CTX,
      });

      // Flush microtasks so placeOutboundCall + placeholder write run.
      await vi.advanceTimersByTimeAsync(50);

      // PENDING row must exist with no outcome / no endedAt.
      const pending = Array.from(store.contractorCalls.values()).find(
        (c) => c.jobId === job.id && c.contractorId === contractorId && !c.outcome,
      );
      expect(pending).toBeDefined();
      expect(pending?.endedAt).toBeUndefined();

      // dial_started event must reference negotiation anchors.
      const events = store.listJobEvents(job.id);
      const started = events.find((e) => e.kind === "contractor_dial_started");
      expect(started).toBeDefined();
      expect(started?.detail).toMatch(/target \$180/);
      expect(started?.detail).toMatch(/walk-away \$280/);
      expect(started?.detail).toMatch(/anchors:/);
      expect(started?.data?.negotiation).toBeDefined();

      // negotiationContext should have been forwarded to AgentPhone as-is.
      expect(capturedNegotiation).toEqual(NEG_CTX);

      // Now let it time out so the promise resolves (don't leak it).
      await vi.advanceTimersByTimeAsync(95_000);
      const result = await dialPromise;
      expect(result.outcome).toBe("no_answer");
    } finally {
      vi.useRealTimers();
    }
  }, 20_000);

  it("webhook posts an accepted-deal transcript → PENDING upgrades to accepted_job with price + ETA", async () => {
    const job = seedTestJob({ jobId: "job_dial_test_accept" });
    const contractorId = "ctr_7"; // Sunset Drain Pros

    // We need the call to actually succeed end-to-end. Capture the callId
    // produced by AgentPhone, then post a real outbound-webhook payload to
    // /api/calls/outbound that closes the deal.
    let capturedCallId: string | undefined;
    const origPlace = agentphone.placeOutboundCall.bind(agentphone);
    vi.spyOn(agentphone, "placeOutboundCall").mockImplementation(async (input) => {
      const r = await origPlace(input);
      capturedCallId = r.callId;
      // Fire the webhook a tick later — after dialContractorForJob writes
      // its placeholder row. We post to the real route handler so the
      // Gemini parse + ContractorCall upgrade + event-write path is
      // exercised end-to-end.
      setTimeout(() => {
        if (!capturedCallId) return;
        const body = JSON.stringify({
          event: "agent.call_ended",
          timestamp: new Date().toISOString(),
          data: {
            callId: capturedCallId,
            durationSeconds: 42,
            transcript: [
              { role: "agent", content: "We have a plumbing job at 342 Valencia. Can you accept?" },
              { role: "user", content: "Yes, I can be there today 3-5pm for $200." },
              { role: "agent", content: "Great, thanks." },
            ],
            metadata: { jobId: job.id, contractorId },
          },
        });
        void outboundWebhookPOST(
          new Request("http://localhost/api/calls/outbound", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          }),
        );
      }, 5);
      return r;
    });

    const result = await dialContractorForJob({
      jobId: job.id,
      contractorId,
      negotiationContext: NEG_CTX,
    });

    expect(result.outcome).toBe("accepted_job");
    expect(result.fromWebhook).toBe(true);
    expect(typeof result.contractorCallId).toBe("string");
    expect(result.quotedPriceCents).toBeGreaterThan(0);
    expect(result.etaWindow).toBeTruthy();

    // ContractorCall row was upgraded with the outcome.
    const rec = store.contractorCalls.get(result.contractorCallId);
    expect(rec?.outcome).toBe("accepted_job");
    expect(rec?.endedAt).toBeDefined();
    expect(rec?.quotedPriceCents).toBe(result.quotedPriceCents);

    // dial_outcome event was appended (by the outbound webhook route).
    const events = store.listJobEvents(job.id);
    const outcomeEvent = events.find(
      (e) =>
        e.kind === "contractor_dial_outcome" &&
        (e.data?.contractorCallId as string | undefined) === result.contractorCallId,
    );
    expect(outcomeEvent).toBeDefined();
    expect(outcomeEvent?.data?.outcome).toBe("accepted_job");
    expect(outcomeEvent?.data?.source).toBe("outbound_webhook");
  });

  it("no webhook within timeout → no_answer + 'no answer (timeout)' event", async () => {
    const job = seedTestJob({ jobId: "job_dial_test_timeout" });
    const contractorId = "ctr_21"; // Castro Drain & Pipe

    // No webhook simulation — leave the PENDING row untouched.
    const origPlace = agentphone.placeOutboundCall.bind(agentphone);
    vi.spyOn(agentphone, "placeOutboundCall").mockImplementation((input) => origPlace(input));

    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });
    try {
      const dialPromise = dialContractorForJob({
        jobId: job.id,
        contractorId,
      });
      // Drive past the 90s deadline (in fake time).
      await vi.advanceTimersByTimeAsync(95_000);
      const result = await dialPromise;

      expect(result.outcome).toBe("no_answer");
      expect(result.fromWebhook).toBe(false);

      const events = store.listJobEvents(job.id);
      const timeoutEvent = events.find(
        (e) =>
          e.kind === "contractor_dial_outcome" &&
          (e.data?.source as string | undefined) === "dial_timeout" &&
          (e.data?.contractorId as string | undefined) === contractorId,
      );
      expect(timeoutEvent).toBeDefined();
      expect(timeoutEvent?.title).toMatch(/no answer \(timeout\)/i);
    } finally {
      vi.useRealTimers();
    }
  }, 20_000);
});
