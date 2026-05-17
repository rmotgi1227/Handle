import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface AgentMailClient {
  sendEmail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    tags?: string[];
  }): Promise<{ messageId: string }>;
}

export const agentmail: AgentMailClient = pickImpl<AgentMailClient>("agentmail", {
  mock: mock.agentmail,
  live: live.agentmail,
} satisfies AdapterModule<AgentMailClient>);
