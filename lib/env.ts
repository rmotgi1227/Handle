import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  INTEGRATION_MODE: z.enum(["mock", "live"]).default("mock"),

  AGENTPHONE_API_KEY: z.string().optional(),
  AGENTPHONE_NUMBER: z.string().optional(),
  AGENTPHONE_WEBHOOK_SECRET: z.string().optional(),
  AGENTPHONE_AGENT_ID: z.string().optional(),
  AGENTPHONE_CONTRACTOR_AGENT_ID: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-pro"),

  SUPERMEMORY_API_KEY: z.string().optional(),
  SUPERMEMORY_PROJECT_ID: z.string().optional(),

  MOSS_PROJECT_ID: z.string().optional(),
  MOSS_PROJECT_KEY: z.string().optional(),
  MOSS_CONTRACTORS_INDEX: z.string().default("cma_contractors_v1"),
  MOSS_KNOWLEDGE_INDEX: z.string().default("cma_knowledge_v1"),

  BROWSERUSE_API_KEY: z.string().optional(),
  BROWSERUSE_BASE_URL: z.string().optional(),

  SPONGE_API_KEY: z.string().optional(),
  SPONGE_ACCOUNT_ID: z.string().optional(),

  AGENTMAIL_API_KEY: z.string().optional(),
  AGENTMAIL_INBOX: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);

export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required env: ${key}`);
  }
  return value as NonNullable<Env[K]>;
}
