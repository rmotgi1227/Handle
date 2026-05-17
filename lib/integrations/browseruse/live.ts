import { z } from "zod";
import { env } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/adapter";
import type { BrowserUseClient } from "./index";

/**
 * Live Browser Use client.
 *
 * Cloud API (verified 2026-05-17 via docs.browser-use.com/llms-full.txt):
 *   - Base URL: https://api.browser-use.com/api/v3
 *   - Auth:     X-Browser-Use-API-Key: <key>          (NOT Bearer)
 *   - Start:    POST /sessions   body { task, output_schema? }  → { id, ... }
 *   - Status:   GET  /sessions/{id}                              → { status, output, ... }
 *   - Terminal statuses: idle | stopped | error | timed_out
 *
 * Browser Use is async — sessions take 30–120s. We submit a task with a JSON
 * Schema constraining the output to our `candidates` shape, then poll until
 * terminal. Bounded by MAX_POLL_S so a stuck session can't hang the orchestrator.
 */

const POLL_MS = 2_000;
const MAX_POLL_S = 90;
const TERMINAL_STATUSES = new Set(["idle", "stopped", "error", "timed_out"]);

const CandidateSchema = z.object({
  name: z.string(),
  phone: z.string(),
  rating: z.number().optional(),
  url: z.string().optional(),
});
const OutputSchema = z.object({
  candidates: z.array(CandidateSchema),
});

const SessionSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  output: z.unknown().optional(),
});

const OUTPUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          rating: { type: "number" },
          url: { type: "string" },
        },
        required: ["name", "phone"],
      },
    },
  },
  required: ["candidates"],
} as const;

function requireKeys(method: string): { apiKey: string; baseUrl: string } {
  if (!env.BROWSERUSE_API_KEY || !env.BROWSERUSE_BASE_URL) {
    throw new IntegrationError(
      "browseruse",
      `BROWSERUSE_API_KEY / BROWSERUSE_BASE_URL missing — cannot call ${method} in live mode. ` +
        `Set both env vars or switch BROWSERUSE_MODE=mock.`,
    );
  }
  return {
    apiKey: env.BROWSERUSE_API_KEY,
    baseUrl: env.BROWSERUSE_BASE_URL.replace(/\/$/, ""),
  };
}

function authHeaders(apiKey: string, withContentType: boolean): Record<string, string> {
  const h: Record<string, string> = { "X-Browser-Use-API-Key": apiKey };
  if (withContentType) h["content-type"] = "application/json";
  return h;
}

async function startSession(baseUrl: string, apiKey: string, task: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/sessions`, {
      method: "POST",
      headers: authHeaders(apiKey, true),
      body: JSON.stringify({ task, output_schema: OUTPUT_JSON_SCHEMA }),
    });
  } catch (cause) {
    throw new IntegrationError("browseruse", "startSession network error", cause);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new IntegrationError(
      "browseruse",
      `startSession returned ${res.status}: ${body.slice(0, 200)}`,
    );
  }
  const json: unknown = await res.json();
  const parsed = SessionSchema.safeParse(json);
  if (!parsed.success) {
    throw new IntegrationError(
      "browseruse",
      `startSession response shape mismatch: ${parsed.error.message}`,
    );
  }
  return parsed.data.id;
}

async function getSession(
  baseUrl: string,
  apiKey: string,
  id: string,
): Promise<{ status: string | undefined; output: unknown }> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/sessions/${encodeURIComponent(id)}`, {
      headers: authHeaders(apiKey, false),
    });
  } catch (cause) {
    throw new IntegrationError("browseruse", `getSession ${id} network error`, cause);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new IntegrationError(
      "browseruse",
      `getSession ${id} returned ${res.status}: ${body.slice(0, 200)}`,
    );
  }
  const json: unknown = await res.json();
  const parsed = SessionSchema.safeParse(json);
  if (!parsed.success) {
    throw new IntegrationError(
      "browseruse",
      `getSession response shape mismatch: ${parsed.error.message}`,
    );
  }
  return { status: parsed.data.status, output: parsed.data.output };
}

async function pollUntilComplete(
  baseUrl: string,
  apiKey: string,
  id: string,
): Promise<unknown> {
  const deadline = Date.now() + MAX_POLL_S * 1000;
  while (Date.now() < deadline) {
    const { status, output } = await getSession(baseUrl, apiKey, id);
    if (status && TERMINAL_STATUSES.has(status)) {
      if (status === "error" || status === "timed_out") {
        throw new IntegrationError("browseruse", `session ${id} ended in ${status}`);
      }
      return output;
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new IntegrationError(
    "browseruse",
    `session ${id} did not reach terminal status within ${MAX_POLL_S}s`,
  );
}

export const browseruse: BrowserUseClient = {
  async findContractors({ trade, city, near, limit }) {
    const { apiKey, baseUrl } = requireKeys("findContractors");
    const target = Math.max(1, Math.min(limit ?? 5, 10));
    const nearHint = near ? ` near ${near}` : "";
    const task =
      `Find ${target} highly-rated ${trade.replace(/_/g, " ")} contractors in ${city}${nearHint}. ` +
      `For each, return: name, phone (E.164 format if possible), optional rating (0-5), optional url. ` +
      `Prefer well-reviewed local businesses. Return the structured candidates list.`;

    const startedAt = Date.now();
    const sessionId = await startSession(baseUrl, apiKey, task);
    const output = await pollUntilComplete(baseUrl, apiKey, sessionId);
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs > 60_000) {
      console.warn(`[browseruse] findContractors took ${elapsedMs}ms (session ${sessionId})`);
    }

    const parsed = OutputSchema.safeParse(output);
    if (!parsed.success) {
      throw new IntegrationError(
        "browseruse",
        `findContractors output schema mismatch: ${parsed.error.message}`,
      );
    }
    return { candidates: parsed.data.candidates };
  },
};
