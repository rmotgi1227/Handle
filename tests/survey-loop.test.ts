import { describe, it, expect } from "vitest";
import { agentphone } from "@/lib/integrations/agentphone";
import { supermemory } from "@/lib/integrations/supermemory";

// ─── agentphone.sendSms mock ─────────────────────────────────────────────────

describe("agentphone mock — sendSms", () => {
  it("sendSms returns a messageId", async () => {
    const out = await agentphone.sendSms({
      to: "+14155551234",
      body: "Hi there, rate your experience: http://localhost:3000/survey/job_abc",
    });
    expect(out).toMatchObject({ messageId: expect.any(String) });
    expect(out.messageId.length).toBeGreaterThan(0);
  });

  it("sendSms with special chars in body doesn't throw", async () => {
    const out = await agentphone.sendSms({
      to: "+14155559999",
      body: `Rate "the work" & more: http://localhost/survey/abc?x=1&y=2`,
    });
    expect(out.messageId).toBeTruthy();
  });
});

// ─── supermemory mock: metadata round-trip ───────────────────────────────────

describe("supermemory mock — metadata round-trip", () => {
  // The module-level `rows` array accumulates across tests in the same process.
  // Use unique query tokens per test group to avoid cross-test pollution.

  it("recall returns metadata written by remember", async () => {
    await supermemory.remember({
      text: "survey_response contractor ctr_test1 plumbing property prop_x. Tenant satisfaction score: 2/5.",
      tags: ["survey_response", "contractor:ctr_test1", "property:prop_x", "trade:plumbing"],
      metadata: { contractorId: "ctr_test1", propertyId: "prop_x", trade: "plumbing", score: 2 },
    });

    const { memories } = await supermemory.recall({
      query: "survey_response contractor plumbing property prop_x",
      topK: 5,
    });

    const match = memories.find((m) => (m.metadata?.contractorId as string) === "ctr_test1");
    expect(match).toBeDefined();
    expect(match?.metadata?.score).toBe(2);
    expect(match?.metadata?.contractorId).toBe("ctr_test1");
  });

  it("rows without metadata return empty metadata object", async () => {
    await supermemory.remember({
      text: "Job assigned to contractor at 42 Main St plumbing no_meta_test",
      tags: ["job", "plumbing"],
      // no metadata
    });

    const { memories } = await supermemory.recall({
      query: "no_meta_test plumbing",
      topK: 3,
    });

    for (const m of memories) {
      expect(m.metadata).toBeDefined();
      expect(typeof m.metadata).toBe("object");
    }
  });
});

// ─── contractor exclusion logic ───────────────────────────────────────────────

describe("contractor exclusion — score thresholds", () => {
  it("score ≤ 2 memory is recalled and contractor ID is accessible", async () => {
    await supermemory.remember({
      text: "survey_response contractor ctr_bad1 hvac property prop_y. Tenant satisfaction score: 1/5. Feedback: terrible job.",
      tags: ["survey_response", "contractor:ctr_bad1", "property:prop_y", "trade:hvac"],
      metadata: { contractorId: "ctr_bad1", propertyId: "prop_y", trade: "hvac", score: 1 },
    });

    const { memories } = await supermemory.recall({
      query: "survey_response contractor hvac property prop_y",
      topK: 5,
    });

    const negativeIds = new Set<string>();
    for (const mem of memories) {
      const contractorId = mem.metadata?.contractorId as string | undefined;
      const score = mem.metadata?.score as number | undefined;
      if (contractorId && typeof score === "number" && score <= 2) {
        negativeIds.add(contractorId);
      }
    }

    expect(negativeIds.has("ctr_bad1")).toBe(true);
  });

  it("score > 2 contractor is NOT added to exclusion set", async () => {
    await supermemory.remember({
      text: "survey_response contractor ctr_good1 hvac property prop_z. Tenant satisfaction score: 4/5.",
      tags: ["survey_response", "contractor:ctr_good1", "property:prop_z", "trade:hvac"],
      metadata: { contractorId: "ctr_good1", propertyId: "prop_z", trade: "hvac", score: 4 },
    });

    const { memories } = await supermemory.recall({
      query: "survey_response contractor hvac property prop_z",
      topK: 5,
    });

    const negativeIds = new Set<string>();
    for (const mem of memories) {
      const contractorId = mem.metadata?.contractorId as string | undefined;
      const score = mem.metadata?.score as number | undefined;
      if (contractorId && typeof score === "number" && score <= 2) {
        negativeIds.add(contractorId);
      }
    }

    expect(negativeIds.has("ctr_good1")).toBe(false);
  });

  it("missing metadata.score does not cause exclusion", async () => {
    await supermemory.remember({
      text: "Job assigned to ctr_assign1 for 99 Oak St electrical no_score_test",
      tags: ["job", "electrical"],
      metadata: { contractorId: "ctr_assign1", jobId: "job_x" },
    });

    const { memories } = await supermemory.recall({
      query: "no_score_test electrical ctr_assign1",
      topK: 3,
    });

    const negativeIds = new Set<string>();
    for (const mem of memories) {
      const contractorId = mem.metadata?.contractorId as string | undefined;
      const score = mem.metadata?.score as number | undefined;
      if (contractorId && typeof score === "number" && score <= 2) {
        negativeIds.add(contractorId);
      }
    }

    expect(negativeIds.has("ctr_assign1")).toBe(false);
  });
});

// ─── survey_response tag prioritises survey memories over assignment memories ─

describe("survey_response tag — signal vs noise", () => {
  it("survey memory scores higher than assignment memory on survey_response query", async () => {
    await supermemory.remember({
      text: "Job assigned to Mike at 10 Pine St plumbing noise_test",
      tags: ["job", "plumbing"],
      metadata: { contractorId: "ctr_mike", jobId: "job_noise" },
    });
    await supermemory.remember({
      text: "survey_response contractor ctr_mike plumbing property prop_q noise_test. Tenant satisfaction score: 2/5.",
      tags: ["survey_response", "contractor:ctr_mike", "property:prop_q", "trade:plumbing"],
      metadata: { contractorId: "ctr_mike", propertyId: "prop_q", trade: "plumbing", score: 2 },
    });

    const { memories } = await supermemory.recall({
      query: "survey_response contractor plumbing noise_test",
      topK: 1,
    });

    expect(memories.length).toBe(1);
    // The survey memory has both "survey_response" and other tokens in common —
    // it should score highest and be the one returned.
    expect(memories[0].metadata?.score).toBe(2);
  });
});
