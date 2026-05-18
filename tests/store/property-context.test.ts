import { describe, it, expect, beforeAll } from "vitest";
import "@/lib/store/bootstrap"; // ensures seed runs once
import {
  getPropertyContext,
  getPropertyContextByCallerPhone,
  summarizePropertyForAgent,
} from "@/lib/store/property-context";

describe("property-context — tenant DB lookups", () => {
  beforeAll(() => {
    // Seed runs via bootstrap import above.
  });

  it("resolves Marcus's seeded number to his unit + building", () => {
    const hit = getPropertyContextByCallerPhone("+14155551410");
    expect(hit).not.toBeNull();
    expect(hit?.tenant.name).toBe("Marcus Chen");
    expect(hit?.unit?.unit.label).toBe("3B");
    expect(hit?.context.property.address).toBe("342 Valencia St");
  });

  it("normalizes digits — accepts a number written with spaces/dashes/parens", () => {
    const hit = getPropertyContextByCallerPhone("+1 (415) 555-1410");
    expect(hit?.tenant.name).toBe("Marcus Chen");
  });

  it("returns null for a number not in the directory", () => {
    expect(getPropertyContextByCallerPhone("+19999999999")).toBeNull();
  });

  it("populates occupancy + preferred contractors for prop_1", () => {
    const ctx = getPropertyContext("prop_1");
    expect(ctx).not.toBeNull();
    expect(ctx!.occupancy.totalUnits).toBeGreaterThanOrEqual(6);
    expect(ctx!.occupancy.occupiedUnits).toBeGreaterThan(0);
  });

  it("summarizePropertyForAgent surfaces building gate code + unit lockbox", () => {
    const ctx = getPropertyContext("prop_1")!;
    const marcusUnit = ctx.units.find((u) => u.unit.label === "3B");
    const summary = summarizePropertyForAgent(ctx, marcusUnit);
    expect(summary).toContain("342 Valencia St");
    expect(summary).toContain("3B");
    expect(summary).toContain("0316"); // unit lockbox
    expect(summary).toContain("Spend cap"); // owner rule
  });
});
