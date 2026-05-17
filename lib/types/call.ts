import type { PersonRole } from "./person";

export type CallStatus = "ringing" | "in_progress" | "completed" | "missed" | "failed";

export interface CallTranscriptLine {
  at: string;
  speaker: "caller" | "agent";
  text: string;
}

export interface Call {
  id: string;
  fromNumber: string;
  callerId?: string;
  callerRole?: PersonRole;
  propertyId?: string;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  transcript: CallTranscriptLine[];
  summary?: string;
  intent?: string;
  jobId?: string;
}
