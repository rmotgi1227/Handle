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
    /** Optional retrieval snippets — one will be woven into the script when
     * it fits naturally. Each list is consulted in order; empty/missing is fine. */
    recall?: {
      pastJobs?: { text: string }[];
      ownerPreferences?: { text: string }[];
      knowledgeHits?: { text: string }[];
    };
  }): Promise<{ script: string }>;
  summarizeJob(input: {
    events: { kind: string; title: string; at: string }[];
  }): Promise<{ summary: string }>;
}

export const gemini: GeminiClient = pickImpl<GeminiClient>("gemini", {
  mock: mock.gemini,
  live: live.gemini,
} satisfies AdapterModule<GeminiClient>);
