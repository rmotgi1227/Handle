import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import type { JobUrgency, Trade } from "@/lib/types";
import * as mock from "./mock";
import * as live from "./live";

export interface GeminiClient {
  classifyIntent(input: { transcript: string }): Promise<{
    intent: string;
    trade: Trade;
    urgency: JobUrgency;
    title: string;
    description: string;
    confidence: number;
  }>;
  draftContractorScript(input: {
    jobTitle: string;
    jobDescription: string;
    propertyAddress: string;
    urgency: string;
  }): Promise<{ script: string }>;
  summarizeJob(input: {
    events: { kind: string; title: string; at: string }[];
  }): Promise<{ summary: string }>;
}

export const gemini: GeminiClient = pickImpl<GeminiClient>("gemini", {
  mock: mock.gemini,
  live: live.gemini,
} satisfies AdapterModule<GeminiClient>);
