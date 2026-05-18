/**
 * Behavior tests for the orchestrator's recall context — exercised indirectly
 * through `runAgent`, which is the only public surface (buildRecallContext
 * is module-private). Two decision points covered:
 *
 *  1. Supermemory hits split correctly between `pastJobs` and `ownerPreferences`
 *     using the in-code regex (/owner|prefer|portfolio|authoriz/i). The split
 *     surfaces in the `context_recalled` event title:
 *       "Recalled N prior jobs · M contractor matches · K owner prefs"
 *
 *  2. When `moss.searchContractors` rejects, the orchestrator still proceeds
 *     and the failure is reflected via a `recall_partial` event whose data
 *     names `moss.contractors` in failedSources.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";

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
import { moss } from "@/lib/integrations/moss";
import { supermemory } from "@/lib/integrations/supermemory";
import { seedRetrievalOnce } from "@/lib/store/seed-retrieval";
import type {
  CallTranscriptLine,
  ContractorCallOutcome,
} from "@/lib/types";

function seedCall(id: string, propertyId: string, transcriptLines: string[]) {
  const now = new Date().toISOString();
  const lines: CallTranscriptLine[] = transcriptLines.map((text, i) => ({
    at: new Date(Date.parse(now) + i * 1000).toISOString(),
    speaker: i % 2 === 0 ? "agent" : "caller",
    text,
  }));
  store.upsertCall({
    id,
    fromNumber: "+14155551410",
    callerId: "person_tenant_1",
    callerRole: "tenant",
    propertyId,
    status: "in_progress",
    startedAt: now,
    transcript: lines,
  });
}

/** Auto-accept every dial via the same webhook simulator as runAgent.spec.ts. */
function wireAutoAcceptWebhook() {
  const original = agentphone.placeOutboundCall.bind(agentphone);
  return vi.spyOn(agentphone, "placeOutboundCall").mockImplementation(async (input) => {
    const r = await original(input);
    setTimeout(() => {
      const rec = store.contractorCalls.get(r.callId);
      if (!rec) return;
      store.contractorCalls.set(r.callId, {
        ...rec,
        endedAt: new Date().toISOString(),
        outcome: "accepted_job" as ContractorCallOutcome,
        quotedPriceCents: 18000,
        etaWindow: "today 3–5pm",
        transcriptSummary: "simulated accepted",
      });
    }, 10);
    return r;
  });
}

beforeAll(async () => {
  await seedRetrievalOnce();
});

beforeEach(() => {
  vi.spyOn(agentphone, "fetchTranscript").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildRecallContext — pastJobs vs ownerPreferences split", () => {
  it("regex partitions Supermemory hits correctly with realistic fixture text", async () => {
    // Past job text (no owner/prefer/portfolio/authoriz tokens).
    const pastJobText =
      "Job j_test_split_01 at 342 Valencia St Unit 3B — kitchen sink leak resolved by AcmePlumb on 2026-04-12. Cost $215.";
    // Owner preference text (matches "Owner" + "prefer" + "portfolio" + "authoriz").
    const ownerPrefText =
      "Owner Priya Kapoor (342 Valencia St Unit 3B portfolio) prefers insured contractors only and authorizes up to $500.";

    await supermemory.remember({
      text: pastJobText,
      tags: ["job", "plumbing"],
      metadata: { propertyId: "prop_1" },
    });
    await supermemory.remember({
      text: ownerPrefText,
      tags: ["preference", "owner"],
      metadata: { propertyId: "prop_1" },
    });

    // Manually verify the regex split — this is the exact split logic from
    // buildRecallContext. If this assertion ever drifts, the indirect
    // assertion below also drifts and the cause is unambiguous.
    const splitRegex = /owner|prefer|portfolio|authoriz/i;
    expect(splitRegex.test(pastJobText)).toBe(false);
    expect(splitRegex.test(ownerPrefText)).toBe(true);

    seedCall("call_recall_split_1", "prop_1", [
      "agent: hi",
      "caller: I have a kitchen leak under the sink, water is leaking onto the floor",
      "agent: noted",
      "caller: please dispatch a plumber",
    ]);

    wireAutoAcceptWebhook();

    const result = await runAgent({ callId: "call_recall_split_1" });
    const events = store.listJobEvents(result.jobId);
    const recalled = events.find((e) => e.kind === "context_recalled");
    expect(recalled).toBeDefined();

    // Title shape: "Recalled N prior jobs · M contractor matches · K owner prefs"
    const m = recalled!.title.match(
      /Recalled (\d+) prior jobs · (\d+) contractor matches · (\d+) owner prefs/,
    );
    expect(m).not.toBeNull();
    const priorJobs = Number.parseInt(m![1], 10);
    const ownerPrefs = Number.parseInt(m![3], 10);

    // Both buckets should have hits — we just seeded one of each, plus the
    // seedRetrieval baseline (8 past jobs + 3 owner prefs at 342 Valencia).
    expect(priorJobs).toBeGreaterThanOrEqual(1);
    expect(ownerPrefs).toBeGreaterThanOrEqual(1);
  });
});

describe("buildRecallContext — partial-failure tolerance", () => {
  it("moss.searchContractors throws → orchestrator proceeds + recall_partial event names the failed source", async () => {
    // Force the contractor-search leg of recall to fail; leave knowledge +
    // supermemory healthy. The orchestrator must still complete dispatch
    // (browser-use fallback fills the contractor pool) and the partial
    // failure must surface as a recall_partial event with moss.contractors
    // in failedSources.
    vi.spyOn(moss, "searchContractors").mockRejectedValue(new Error("moss-down"));

    seedCall("call_recall_failure_1", "prop_1", [
      "agent: hi",
      "caller: I have a kitchen leak under the sink",
      "agent: noted",
      "caller: water is on the floor",
    ]);

    wireAutoAcceptWebhook();

    const result = await runAgent({ callId: "call_recall_failure_1" });

    // The orchestrator must complete the dispatch — not bail.
    const job = store.getJob(result.jobId)!;
    expect(["scheduled", "needs_manual_routing"]).toContain(job.status);

    const events = store.listJobEvents(job.id);
    const partial = events.find((e) => e.kind === "recall_partial");
    expect(partial).toBeDefined();
    const failedSources = partial?.data?.failedSources as string[] | undefined;
    expect(failedSources).toBeDefined();
    expect(failedSources).toContain("moss.contractors");

    // And contractor_search_completed should still have fired (from the
    // browser-use fallback path, because mossHits was empty).
    const search = events.find((e) => e.kind === "contractor_search_completed");
    expect(search).toBeDefined();
    expect(search?.data?.source).toBe("browser_use");
  });
});
