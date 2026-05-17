import { describe, it, expect, beforeAll } from "vitest";
import { moss } from "@/lib/integrations/moss";

describe("moss mock", () => {
  beforeAll(async () => {
    await moss.init();
    await moss.indexContractor({
      contractorId: "ctr_test_001",
      name: "Acme Plumbing",
      trades: ["plumbing"],
      city: "San Francisco",
      specialties: ["leak", "kitchen sink", "emergency"],
      rating: 4.9,
    });
    await moss.indexContractor({
      contractorId: "ctr_test_002",
      name: "Marina Electric",
      trades: ["electrical"],
      city: "San Francisco",
      specialties: ["panel upgrade", "EV charger"],
      rating: 4.7,
    });
    await moss.indexKnowledge({
      id: "kb_test_001",
      text: "kitchen sink leak under cabinet → check supply line, p-trap, garbage disposal seal",
      tags: ["plumbing", "leak"],
    });
  });

  it("init is idempotent", async () => {
    await expect(moss.init()).resolves.toBeUndefined();
    await expect(moss.init()).resolves.toBeUndefined();
  });

  it("searchContractors returns hits with score", async () => {
    const out = await moss.searchContractors({
      trade: "plumbing",
      city: "San Francisco",
      problem: "leak under kitchen sink",
      topK: 5,
    });
    expect(Array.isArray(out.hits)).toBe(true);
    expect(out.hits.length).toBeGreaterThan(0);
    expect(out.hits[0]).toMatchObject({
      contractorId: expect.any(String),
      score: expect.any(Number),
    });
    expect(out.hits[0].contractorId).toBe("ctr_test_001");
  });

  it("searchKnowledge returns hits with text and score", async () => {
    const out = await moss.searchKnowledge({ query: "leak under sink", topK: 3 });
    expect(Array.isArray(out.hits)).toBe(true);
    expect(out.hits.length).toBeGreaterThan(0);
    expect(out.hits[0]).toMatchObject({
      id: expect.any(String),
      text: expect.any(String),
      score: expect.any(Number),
    });
  });
});
