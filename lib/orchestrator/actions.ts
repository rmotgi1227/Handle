import { agentmail } from "@/lib/integrations/agentmail";
import { sponge } from "@/lib/integrations/sponge";
import { store } from "@/lib/store/memory";
import type { Job } from "@/lib/types";

/**
 * Pure orchestrator actions. Both route handlers and dashboard server actions
 * call into these — keeps logic single-sourced and lets the dashboard skip the
 * HTTP round-trip.
 */

export class ActionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

function getJobOrThrow(jobId: string): Job {
  const job = store.getJob(jobId);
  if (!job) throw new ActionError("job_not_found", `job ${jobId} not found`, 404);
  return job;
}

// --- Mark complete (PM-driven, no survey data) ---
export interface MarkJobCompleteInput {
  jobId: string;
  note?: string;
}
export interface MarkJobCompleteResult {
  job: Job;
}
export async function markJobComplete(
  input: MarkJobCompleteInput,
): Promise<MarkJobCompleteResult> {
  const job = getJobOrThrow(input.jobId);
  const updated = store.upsertJob({ id: job.id, status: "completed" });
  store.appendEvent({
    jobId: job.id,
    kind: "work_completed",
    title: "Marked complete",
    detail: input.note,
  });
  return { job: updated };
}

// --- Create invoice ---
export interface CreateInvoiceInput {
  jobId: string;
  amountCents: number;
}
export interface CreateInvoiceResult {
  invoiceId: string;
  payUrl: string;
}
export async function createInvoiceForJob(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const job = getJobOrThrow(input.jobId);
  if (!job.assignedContractorId) {
    throw new ActionError("no_contractor", "job has no assigned contractor", 400);
  }
  const contractor = store.contractors.get(job.assignedContractorId);
  if (!contractor) throw new ActionError("contractor_not_found", "contractor not found", 404);

  const property = store.properties.get(job.propertyId);
  const owner = property ? store.people.get(property.ownerId) : undefined;
  if (!owner?.email) {
    // Fail loud instead of silently emailing a hardcoded address — critical
    // once any vendor flips to live mode.
    throw new ActionError(
      "no_payer_email",
      `Owner ${property?.ownerId ?? "(missing)"} has no email on file; cannot send invoice.`,
      400,
    );
  }
  const payerEmail = owner.email;

  const invoice = await sponge.createInvoice({
    contractorId: contractor.id,
    contractorEmail: contractor.email,
    payerEmail,
    amountCents: input.amountCents,
    memo: `Invoice for ${job.title}`,
  });

  store.appendEvent({
    jobId: job.id,
    kind: "invoice_sent",
    title: `Invoice sent — $${(input.amountCents / 100).toFixed(2)}`,
    detail: `Pay link generated (Sponge invoice ${invoice.invoiceId})`,
    data: {
      payUrl: invoice.payUrl,
      invoiceId: invoice.invoiceId,
      amountCents: input.amountCents,
    },
  });

  await agentmail.sendEmail({
    to: payerEmail,
    subject: `Invoice for ${job.title}`,
    text: `Your invoice for ${job.title} is ready. Pay here: ${invoice.payUrl}`,
    tags: ["invoice", job.id],
  });

  store.upsertJob({
    id: job.id,
    status: "awaiting_payment",
    totalCostCents: input.amountCents,
  });

  return { invoiceId: invoice.invoiceId, payUrl: invoice.payUrl };
}

// --- Send a survey request (email the tenant a link, do NOT record a score) ---
export interface SendSurveyRequestInput {
  jobId: string;
}
export interface SendSurveyRequestResult {
  messageId: string;
}
export async function sendSurveyRequest(
  input: SendSurveyRequestInput,
): Promise<SendSurveyRequestResult> {
  const job = getJobOrThrow(input.jobId);
  const reporter = store.people.get(job.reportedByPersonId);
  const to = reporter?.email ?? "tenant@example.com";

  const sent = await agentmail.sendEmail({
    to,
    subject: `How was the work on "${job.title}"?`,
    text: `Hi ${reporter?.name ?? "there"}, please rate the work: ${process.env.NEXT_PUBLIC_APP_URL ?? ""}/survey/${job.id}`,
    tags: ["survey", job.id],
  });

  store.upsertJob({ id: job.id, status: "awaiting_survey" });
  store.appendEvent({
    jobId: job.id,
    kind: "survey_sent",
    title: "Survey request sent",
    detail: `Emailed ${to}`,
  });

  return { messageId: sent.messageId };
}

// --- Record a survey response ---
export interface RecordSurveyInput {
  jobId: string;
  score: number;
  feedback?: string;
}
export interface RecordSurveyResult {
  job: Job;
}
export async function recordSurveyResponse(
  input: RecordSurveyInput,
): Promise<RecordSurveyResult> {
  const job = getJobOrThrow(input.jobId);
  const updated = store.upsertJob({
    id: job.id,
    status: "completed",
    satisfactionScore: input.score,
    satisfactionFeedback: input.feedback,
  });
  store.appendEvent({
    jobId: job.id,
    kind: "survey_completed",
    title: `Survey: ${input.score}/5`,
    detail: input.feedback,
    data: { score: input.score, feedback: input.feedback },
  });
  return { job: updated };
}
