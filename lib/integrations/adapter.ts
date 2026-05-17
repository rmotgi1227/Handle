import { env } from "@/lib/env";

export type IntegrationMode = "mock" | "live";

/**
 * Resolve the active mode for an integration.
 * Defaults to the global INTEGRATION_MODE env, but each vendor may override
 * by setting `<VENDOR>_MODE`. The override lets a teammate flip a single
 * integration to `live` while keeping the rest mocked during local demo.
 */
export function resolveMode(vendor: string): IntegrationMode {
  const override = process.env[`${vendor.toUpperCase()}_MODE`];
  if (override === "mock" || override === "live") return override;
  return env.INTEGRATION_MODE;
}

export class IntegrationError extends Error {
  constructor(
    public vendor: string,
    message: string,
    public cause?: unknown,
  ) {
    super(`[${vendor}] ${message}`);
    this.name = "IntegrationError";
  }
}

/**
 * Adapter pattern: each vendor exports a typed interface in `index.ts`,
 * with `mock.ts` (deterministic stub data for demo) and `live.ts` (real
 * API calls). The `index.ts` switches between them via resolveMode().
 *
 * Mock implementations MUST stay valid for demo recording — don't gate
 * them on env vars.
 */
export interface AdapterModule<T> {
  mock: T;
  live: T;
}

export function pickImpl<T>(vendor: string, module: AdapterModule<T>): T {
  return resolveMode(vendor) === "live" ? module.live : module.mock;
}
