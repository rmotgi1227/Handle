import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const ORIG_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.resetModules();
  process.env.SUPERMEMORY_MODE = "live";
  process.env.SUPERMEMORY_API_KEY = "test_key";
  process.env.SUPERMEMORY_PROJECT_ID = "test_proj";
});

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
  delete process.env.SUPERMEMORY_MODE;
  delete process.env.SUPERMEMORY_API_KEY;
  delete process.env.SUPERMEMORY_PROJECT_ID;
});

describe("supermemory live", () => {
  it("recall: posts to /v3/search and maps results to memories", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/api\.supermemory\.ai/);
      expect(String(input)).toMatch(/\/v3\/search/);
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test_key");
      expect(headers["x-project-id"]).toBe("test_proj");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ q: "leak", limit: 3 });
      return new Response(
        JSON.stringify({
          results: [
            {
              documentId: "doc_1",
              score: 0.91,
              chunks: [
                { content: "Prior leak at 415 Mission Unit 4B fixed by AcmePlumb", position: 0, isRelevant: true, score: 0.91 },
              ],
              title: "Plumbing fix",
              metadata: {},
              type: "text",
              createdAt: "2026-05-17T00:00:00.000Z",
              updatedAt: "2026-05-17T00:00:00.000Z",
            },
          ],
          total: 1,
          timing: 12,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    const out = await supermemory.recall({ query: "leak", topK: 3 });
    expect(out.memories).toHaveLength(1);
    expect(out.memories[0]).toMatchObject({
      id: "doc_1",
      text: expect.stringContaining("Prior leak"),
      score: expect.any(Number),
    });
  });

  it("remember: posts to /v3/documents and returns id", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/api\.supermemory\.ai/);
      expect(String(input)).toMatch(/\/v3\/documents/);
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer test_key");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        content: "Test memory",
        containerTags: ["job", "plumbing"],
        metadata: { jobId: "job_1" },
      });
      return new Response(JSON.stringify({ id: "mem_new_42", status: "queued" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    const out = await supermemory.remember({
      text: "Test memory",
      tags: ["job", "plumbing"],
      metadata: { jobId: "job_1" },
    });
    expect(out).toMatchObject({ id: expect.any(String) });
    expect(out.id).toBe("mem_new_42");
  });

  it("throws IntegrationError when API key is missing", async () => {
    delete process.env.SUPERMEMORY_API_KEY;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    await expect(supermemory.recall({ query: "x" })).rejects.toThrow(/SUPERMEMORY_API_KEY/);
  });

  it("throws IntegrationError on non-2xx response", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response("Internal Server Error", { status: 500 });
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    await expect(supermemory.recall({ query: "leak" })).rejects.toThrow(/recall returned 500/);
  });

  it("throws IntegrationError when response shape is wrong", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ unexpected: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;
    const { supermemory } = await import("@/lib/integrations/supermemory");
    await expect(supermemory.recall({ query: "leak" })).rejects.toThrow(/shape mismatch/);
  });
});
