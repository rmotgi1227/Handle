import type { Trade } from "./contractor";

export type JobStatus =
  | "triaging"
  | "sourcing_contractor"
  | "scheduled"
  | "in_progress"
  | "awaiting_survey"
  | "awaiting_payment"
  | "payment_authorized"
  | "paid"
  | "completed"
  | "cancelled";

export type JobUrgency = "emergency" | "urgent" | "standard" | "scheduled";

export interface Job {
  id: string;
  propertyId: string;
  reportedByPersonId: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  urgency: JobUrgency;
  trade: Trade;
  title: string;
  description: string;
  diagnosis?: string;
  assignedContractorId?: string;
  scheduledFor?: string;
  totalCostCents?: number;
  callIds: string[];
  visualContext?: {
    description: string;
    severity: "emergency" | "urgent" | "standard";
    guidelines: { id: string; text: string; score: number }[];
    mediaUrl: string;
  };
  satisfactionScore?: number;
  satisfactionFeedback?: string;
  paymentTxnHash?: string;
  ownerInvoiceId?: string;
  ownerPaidAt?: string;
}

export type JobSummary = Pick<
  Job,
  "id" | "title" | "status" | "urgency" | "trade" | "createdAt" | "updatedAt" | "propertyId"
> & {
  contractorName?: string;
  costCents?: number;
};
