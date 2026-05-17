export type Trade =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "appliance"
  | "locksmith"
  | "pest_control"
  | "cleaning"
  | "general"
  | "roofing"
  | "landscaping";

export interface Contractor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  trades: Trade[];
  rating?: number;
  city?: string;
  source: "directory" | "browser_use" | "manual";
  notes?: string;
}

export type ContractorCallOutcome =
  | "no_answer"
  | "voicemail"
  | "declined"
  | "quoted"
  | "accepted_job"
  | "callback_scheduled";

export interface ContractorCall {
  id: string;
  jobId: string;
  contractorId: string;
  startedAt: string;
  endedAt?: string;
  outcome?: ContractorCallOutcome;
  quotedPriceCents?: number;
  etaWindow?: string;
  transcriptSummary?: string;
}
