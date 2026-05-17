import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";

export interface SupermemoryClient {
  recall(input: { query: string; topK?: number }): Promise<{
    memories: { id: string; text: string; score: number }[];
  }>;
  remember(input: {
    text: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string }>;
}

export const supermemory: SupermemoryClient = pickImpl<SupermemoryClient>("supermemory", {
  mock: mock.supermemory,
  live: live.supermemory,
} satisfies AdapterModule<SupermemoryClient>);
