import { describe, it, expect } from "vitest";
import { agentphone } from "@/lib/integrations/agentphone";
import { gemini } from "@/lib/integrations/gemini";
import { supermemory } from "@/lib/integrations/supermemory";
import { browseruse } from "@/lib/integrations/browseruse";
import { sponge } from "@/lib/integrations/sponge";
import { agentmail } from "@/lib/integrations/agentmail";

/**
 * Contract tests on mock mode. We assert SHAPE only — keys and types —
 * so live implementations can be swapped in without rewriting these tests.
 *
 * Mode resolution: INTEGRATION_MODE defaults to "mock" in lib/env.ts,
 * so without env overrides these all hit the mock implementations.
 */

describe("agentphone mock", () => {
  it("parseInboundWebhook returns required shape", async () => {
    const req = new Request("http://localhost/api/calls/incoming", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fromNumber: "+14155551410",
        startedAt: "2026-05-17T09:00:00.000Z",
      }),
    });
    const out = await agentphone.parseInboundWebhook(req);
    expect(out).toMatchObject({
      callId: expect.any(String),
      fromNumber: expect.any(String),
      startedAt: expect.any(String),
    });
  });

  it("fetchTranscript returns an array of transcript lines", async () => {
    const lines = await agentphone.fetchTranscript("call_abcd1234");
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line).toMatchObject({
        at: expect.any(String),
        speaker: expect.stringMatching(/^(caller|agent)$/),
        text: expect.any(String),
      });
    }
  });

  it("placeOutboundCall returns a callId", async () => {
    const out = await agentphone.placeOutboundCall({
      toNumber: "+14155550111",
      script: "Hi, this is dispatch.",
    });
    expect(out).toMatchObject({ callId: expect.any(String) });
  });
});

describe("gemini mock", () => {
  it("classifyIntent returns required shape", async () => {
    const out = await gemini.classifyIntent({
      transcript: "There's water under my sink and it won't stop.",
    });
    expect(out).toMatchObject({
      intent: expect.any(String),
      trade: expect.any(String),
      urgency: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      confidence: expect.any(Number),
    });
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("draftContractorScript returns a script string", async () => {
    const out = await gemini.draftContractorScript({
      jobTitle: "Plumbing issue reported",
      jobDescription: "Leak under kitchen sink",
      propertyAddress: "342 Valencia St, Unit 3B",
      urgency: "urgent",
    });
    expect(out).toMatchObject({ script: expect.any(String) });
    expect(out.script.length).toBeGreaterThan(0);
  });

  it("summarizeJob returns a summary string", async () => {
    const out = await gemini.summarizeJob({
      events: [
        { kind: "call_received", title: "Inbound call", at: "2026-05-17T09:00:00.000Z" },
        { kind: "intent_classified", title: "Plumbing", at: "2026-05-17T09:00:10.000Z" },
      ],
    });
    expect(out).toMatchObject({ summary: expect.any(String) });
    expect(out.summary.length).toBeGreaterThan(0);
  });
});

describe("supermemory mock", () => {
  it("remember returns an id", async () => {
    const out = await supermemory.remember({
      text: "Job for 342 Valencia plumbing",
      tags: ["job", "plumbing"],
    });
    expect(out).toMatchObject({ id: expect.any(String) });
  });

  it("recall returns memories array with required shape", async () => {
    await supermemory.remember({
      text: "Property 342 Valencia had a hvac fix last winter",
      tags: ["property", "hvac"],
    });
    const out = await supermemory.recall({ query: "valencia hvac", topK: 3 });
    expect(out).toMatchObject({ memories: expect.any(Array) });
    for (const m of out.memories) {
      expect(m).toMatchObject({
        id: expect.any(String),
        text: expect.any(String),
        score: expect.any(Number),
      });
    }
  });
});

describe("browseruse mock", () => {
  it("findContractors returns candidates with required shape", async () => {
    const out = await browseruse.findContractors({
      trade: "plumbing",
      city: "San Francisco",
      limit: 3,
    });
    expect(out).toMatchObject({ candidates: expect.any(Array) });
    expect(out.candidates.length).toBeGreaterThan(0);
    for (const c of out.candidates) {
      expect(c).toMatchObject({
        name: expect.any(String),
        phone: expect.any(String),
      });
    }
  });
});

describe("sponge mock", () => {
  it("createInvoice + getInvoice produce the expected shape", async () => {
    const inv = await sponge.createInvoice({
      contractorId: "ctr_seed_1",
      payerEmail: "owner@example.com",
      amountCents: 24_900,
      memo: "Plumbing repair",
    });
    expect(inv).toMatchObject({
      invoiceId: expect.any(String),
      payUrl: expect.any(String),
    });

    const first = await sponge.getInvoice(inv.invoiceId);
    expect(first).toMatchObject({ status: expect.any(String) });

    const second = await sponge.getInvoice(inv.invoiceId);
    expect(second).toMatchObject({ status: expect.any(String) });
  });
});

describe("agentmail mock", () => {
  it("sendEmail returns a messageId", async () => {
    const out = await agentmail.sendEmail({
      to: "owner@example.com",
      subject: "Invoice ready",
      text: "Pay here: https://demo.sponge.test/pay/abc",
    });
    expect(out).toMatchObject({ messageId: expect.any(String) });
  });
});
