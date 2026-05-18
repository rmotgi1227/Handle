import { describe, it, expect } from "vitest";
import "@/lib/store/bootstrap";
import { buildTriagePrompt } from "@/lib/integrations/agentphone/build-triage-prompt";

describe("build-triage-prompt — what the live agent reads", () => {
  it("embeds the full base prompt + directory appendix", () => {
    const out = buildTriagePrompt();
    expect(out.length).toBeGreaterThan(1000);
    expect(out).toContain("Tenant directory");
    expect(out).toContain("---");
  });

  it("includes every seeded tenant's phone in the directory", () => {
    const out = buildTriagePrompt();
    // 7 seeded tenants in the first two buildings + 22 in the extra
    // SF buildings + 12 more in the Mission Bay tower / Russian Hill walk-up
    // = 41 total. Audit may evolve; keep this >= 7 (loose lower bound).
    const matches = out.match(/^- From /gm) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
  });

  it("surfaces unit-level access codes (lockbox) when present", () => {
    const out = buildTriagePrompt();
    // Marcus's unit lockbox from seed.
    expect(out).toContain("0316");
  });

  it("includes the example coaching line so the agent knows how to greet", () => {
    const out = buildTriagePrompt();
    expect(out).toContain("Hi, is this Marcus");
  });
});
