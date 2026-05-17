import { pickImpl, type AdapterModule } from "@/lib/integrations/adapter";
import type { Trade } from "@/lib/types";
import * as mock from "./mock";
import * as live from "./live";

export interface BrowserUseClient {
  findContractors(input: {
    trade: Trade;
    city: string;
    near?: string;
    limit?: number;
  }): Promise<{
    candidates: { name: string; phone: string; rating?: number; url?: string }[];
  }>;
}

export const browseruse: BrowserUseClient = pickImpl<BrowserUseClient>("browseruse", {
  mock: mock.browseruse,
  live: live.browseruse,
} satisfies AdapterModule<BrowserUseClient>);
