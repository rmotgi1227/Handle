import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIG_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  process.env.BROWSERUSE_MODE = "live";
  process.env.BROWSERUSE_API_KEY = "bu_test";
  process.env.BROWSERUSE_BASE_URL = "https://api.browser-use.com/api/v3";
});

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  delete process.env.BROWSERUSE_MODE;
  delete process.env.BROWSERUSE_API_KEY;
  delete process.env.BROWSERUSE_BASE_URL;
  vi.useRealTimers();
});

describe("browseruse live", () => {
  it("findContractors creates a session, polls until idle, parses candidates", async () => {
    let postCount = 0;
    let getCount = 0;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      expect(headers["X-Browser-Use-API-Key"]).toBe("bu_test");

      if (init?.method === "POST") {
        postCount += 1;
        expect(url).toBe("https://api.browser-use.com/api/v3/sessions");
        const body = JSON.parse((init.body as string) ?? "{}");
        expect(typeof body.task).toBe("string");
        expect(body.task).toMatch(/plumbing/i);
        expect(body.task).toMatch(/San Francisco/);
        expect(body.output_schema).toMatchObject({ type: "object" });
        return new Response(JSON.stringify({ id: "sess_abc123", status: "active" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      // GET poll
      getCount += 1;
      expect(url).toBe("https://api.browser-use.com/api/v3/sessions/sess_abc123");
      if (getCount === 1) {
        return new Response(JSON.stringify({ id: "sess_abc123", status: "active" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          id: "sess_abc123",
          status: "idle",
          output: {
            candidates: [
              { name: "Acme Plumbing", phone: "+14155550199", rating: 4.8 },
              { name: "Bay Pipe Co", phone: "+14155550188" },
            ],
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { browseruse } = await import("@/lib/integrations/browseruse");
    const promise = browseruse.findContractors({
      trade: "plumbing",
      city: "San Francisco",
      limit: 5,
    });
    await vi.advanceTimersByTimeAsync(2_500);
    const out = await promise;

    expect(postCount).toBe(1);
    expect(getCount).toBeGreaterThanOrEqual(2);
    expect(out.candidates).toHaveLength(2);
    expect(out.candidates[0]).toMatchObject({
      name: expect.any(String),
      phone: expect.any(String),
    });
  });

  it("throws IntegrationError when the session ends in error", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ id: "sess_err", status: "active" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ id: "sess_err", status: "error" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const { browseruse } = await import("@/lib/integrations/browseruse");
    await expect(
      browseruse.findContractors({ trade: "electrical", city: "San Francisco" }),
    ).rejects.toThrow(/ended in error/);
  });

  it("throws IntegrationError when API key is missing", async () => {
    delete process.env.BROWSERUSE_API_KEY;
    const { browseruse } = await import("@/lib/integrations/browseruse");
    await expect(
      browseruse.findContractors({ trade: "plumbing", city: "San Francisco" }),
    ).rejects.toThrow(/BROWSERUSE_API_KEY/);
  });

  it("throws IntegrationError when BASE_URL is missing", async () => {
    delete process.env.BROWSERUSE_BASE_URL;
    const { browseruse } = await import("@/lib/integrations/browseruse");
    await expect(
      browseruse.findContractors({ trade: "plumbing", city: "San Francisco" }),
    ).rejects.toThrow(/BROWSERUSE_BASE_URL/);
  });
});
