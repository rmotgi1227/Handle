import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import * as mock from "./mock";
import * as live from "./live";
import type { Trade } from "@/lib/types";

export interface MossContractorRecord {
  contractorId: string;
  name: string;
  trades: Trade[];
  city: string;
  specialties: string[];
  rating?: number;
}

export interface MossKnowledgeRecord {
  id: string;
  text: string;
  tags: string[];
}

export interface MossClient {
  init(): Promise<void>;
  indexContractor(record: MossContractorRecord): Promise<void>;
  indexKnowledge(record: MossKnowledgeRecord): Promise<void>;
  searchContractors(input: {
    trade: Trade;
    city: string;
    problem: string;
    topK?: number;
  }): Promise<{ hits: { contractorId: string; score: number }[] }>;
  searchKnowledge(input: {
    query: string;
    topK?: number;
  }): Promise<{ hits: { id: string; text: string; score: number }[] }>;
}

export const moss: MossClient = pickImpl<MossClient>("moss", {
  mock: mock.moss,
  live: live.moss,
} satisfies AdapterModule<MossClient>);
