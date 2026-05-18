import { describe, it, expect } from "vitest";
import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";
import { findContractorsForJob } from "@/lib/orchestrator/run";

describe("findContractorsForJob — pool selection", () => {
  it("returns ≥3 SF plumbers from the seeded directory", async () => {
    const job = store.upsertJob({
      id: "job_test_plumb",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_1",
      trade: "plumbing",
      urgency: "urgent",
      title: "Test plumbing job",
    });
    const out = await findContractorsForJob({
      jobId: job.id,
      trade: "plumbing",
      city: "San Francisco",
    });
    expect(out.contractorIds.length).toBeGreaterThanOrEqual(3);
    for (const id of out.contractorIds) {
      const c = store.contractors.get(id);
      expect(c?.trades).toContain("plumbing");
    }
  });

  it("Moss-first path is used when ≥3 ranked hits are supplied", async () => {
    const job = store.upsertJob({
      id: "job_test_moss_first",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_1",
      trade: "electrical",
      urgency: "urgent",
      title: "Test electrical via moss hits",
    });
    const mossHits = [
      { contractorId: "ctr_1", score: 0.9 },
      { contractorId: "ctr_8", score: 0.8 },
      { contractorId: "ctr_9", score: 0.7 },
    ];
    const out = await findContractorsForJob({
      jobId: job.id,
      trade: "electrical",
      city: "San Francisco",
      mossHits,
    });
    expect(out.contractorIds).toEqual(["ctr_1", "ctr_8", "ctr_9"]);
    const events = store.listJobEvents(job.id);
    const search = events.find((e) => e.kind === "contractor_search_completed");
    expect(search?.data?.source).toBe("moss");
  });
});
