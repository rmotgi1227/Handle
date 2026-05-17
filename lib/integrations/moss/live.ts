import { IntegrationError } from "@/lib/integrations/adapter";
import type { MossClient } from "./index";

function notWired(method: string): never {
  throw new IntegrationError("moss", `${method} live implementation pending — Task 4`);
}

export const moss: MossClient = {
  init: async () => notWired("init"),
  indexContractor: async () => notWired("indexContractor"),
  indexKnowledge: async () => notWired("indexKnowledge"),
  searchContractors: async () => notWired("searchContractors"),
  searchKnowledge: async () => notWired("searchKnowledge"),
};
