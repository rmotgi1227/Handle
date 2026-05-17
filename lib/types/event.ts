export type JobEventKind =
  | "call_received"
  | "intent_classified"
  | "diagnosed"
  | "context_recalled"
  | "contractor_search_started"
  | "contractor_search_completed"
  | "contractor_dial_started"
  | "contractor_dial_outcome"
  | "contractor_assigned"
  | "scheduled"
  | "work_started"
  | "work_completed"
  | "survey_sent"
  | "survey_skipped"
  | "survey_completed"
  | "contractor_skipped"
  | "invoice_sent"
  | "paid"
  | "note"
  | "visual_triage";

export interface JobEvent {
  id: string;
  jobId: string;
  at: string;
  kind: JobEventKind;
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
}
