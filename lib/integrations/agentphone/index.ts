import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface AgentPhoneClient {
  /** Parse the incoming webhook payload from AgentPhone into a normalized Call. */
  parseInboundWebhook(req: Request): Promise<{
    callId: string;
    fromNumber: string;
    startedAt: string;
  }>;
  /** Stream / fetch transcript lines as they arrive. */
  fetchTranscript(callId: string): Promise<
    { at: string; speaker: "caller" | "agent"; text: string }[]
  >;
  /** Place an outbound call (used to dial contractors). */
  placeOutboundCall(input: {
    toNumber: string;
    fromNumber?: string;
    /** First line the agent says when the callee picks up. */
    script: string;
    metadata?: Record<string, string>;
    /**
     * Optional structured context handed to the agent at the start of the
     * call. AgentPhone forwards it as `conversationState`; the agent's
     * system prompt is written to read from it (target/walk-away/comps,
     * history with this contractor, market context). Use this to make the
     * agent autonomous — actively negotiate, anchor with real numbers,
     * and walk away when it should.
     */
    negotiationContext?: NegotiationContext;
  }): Promise<{ callId: string }>;
  /** Parse the incoming AgentPhone voice webhook for a turn-by-turn voice exchange. */
  parseVoiceWebhook(req: Request): Promise<{
    callId: string;
    fromNumber: string;
    transcript: string;
    recentHistory: { role: "user" | "model"; text: string }[];
  }>;
}

/**
 * The shape the contractor-dispatch agent expects under `conversationState`.
 * Keep keys human-readable — the LLM reads this like a briefing card, not
 * a typed RPC.
 */
export interface NegotiationContext {
  job: {
    trade: string;
    urgency: "emergency" | "urgent" | "standard" | "scheduled";
    address: string;
    unit?: string;
    description: string;
  };
  pricing: {
    targetCents: number;
    walkAwayCents: number;
    /** Free-form notes about market rates the agent can drop as anchors. */
    marketContext: string;
    /** Recent quotes the agent can name-drop in negotiation. */
    competitorAnchors?: { contractorName: string; amountCents: number; whenAgo: string }[];
  };
  contractor: {
    name: string;
    /** Past job count + average price + reliability notes, if known. */
    history?: string;
  };
  /** How soon we need this done, in plain language. */
  timeline: string;
}

export const agentphone: AgentPhoneClient = pickImpl<AgentPhoneClient>("agentphone", {
  mock: mock.agentphone,
  live: live.agentphone,
} satisfies AdapterModule<AgentPhoneClient>);
