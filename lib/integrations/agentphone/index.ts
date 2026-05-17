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
    script: string;
    metadata?: Record<string, string>;
  }): Promise<{ callId: string }>;
}

export const agentphone: AgentPhoneClient = pickImpl<AgentPhoneClient>("agentphone", {
  mock: mock.agentphone,
  live: live.agentphone,
} satisfies AdapterModule<AgentPhoneClient>);
