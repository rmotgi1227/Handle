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
  analyzeMedia(input: {
    mediaUrl: string;
    mimeType: "image/jpeg" | "image/png" | "image/webp";
  }): Promise<{
    description: string;
    severity: "emergency" | "urgent" | "standard";
  }>;
  generateVoiceResponse(input: {
    systemContext: string;
    history: { role: "user" | "model"; text: string }[];
    userMessage: string;
  }): Promise<{ text: string }>;
  /**
   * Parse a finished contractor dial transcript and surface the actual outcome.
   * Replaces the placeholder `simulateDialOutcome` once the AgentPhone
   * `agent.call_ended` webhook lands. Returns priceCents and etaWindow when
   * the contractor accepted; both undefined otherwise.
   */
  parseContractorOutcome(input: {
    jobTitle: string;
    urgency: JobUrgency;
    contractorName: string;
    targetCents?: number;
    walkAwayCents?: number;
    transcript: { role: "agent" | "user"; text: string }[];
  }): Promise<{
    outcome: "accepted_job" | "declined" | "callback_scheduled" | "no_answer";
    priceCents?: number;
    etaWindow?: string;
    notes?: string;
  }>;
}

export const gemini: GeminiClient = pickImpl<GeminiClient>("gemini", {
  mock: mock.gemini,
  live: live.gemini,
} satisfies AdapterModule<GeminiClient>);
