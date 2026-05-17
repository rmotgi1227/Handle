import type { Trade } from "./contractor";

export type JobStatus =
  | "triaging"
  | "sourcing_contractor"
  | "scheduled"
  | "in_progress"
  | "awaiting_survey"
  | "awaiting_payment"
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
  satisfactionScore?: number;
  satisfactionFeedback?: string;
}

export type JobSummary = Pick<
  Job,
  "id" | "title" | "status" | "urgency" | "trade" | "createdAt" | "updatedAt" | "propertyId"
> & {
  contractorName?: string;
  costCents?: number;
};
