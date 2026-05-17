import { revalidatePath } from "next/cache";
import { agentmail } from "@/lib/integrations/agentmail";
import { agentphone } from "@/lib/integrations/agentphone";
import { supermemory } from "@/lib/integrations/supermemory";
import { sponge } from "@/lib/integrations/sponge";
import { env } from "@/lib/env";
import { stripe } from "@/lib/integrations/stripe";
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

// --- Receive a contractor invoice (real Stripe invoice generated on contractor's behalf) ---
// In production the contractor would issue this directly from their own Stripe account.
// For the demo, Handle creates the Stripe invoice as the contractor's billing surface so
// the amount + reference are first-class Stripe records the landlord can verify.
export interface CreateInvoiceInput {
  jobId: string;
  amountCents: number;
}
export interface CreateInvoiceResult {
  invoiceId: string;
  hostedUrl: string;
  amountCents: number;
}
export async function createInvoiceForJob(
  input: CreateInvoiceInput,
): Promise<CreateInvoiceResult> {
  const job = getJobOrThrow(input.jobId);
  if (job.status === "paid" || job.status === "completed") {
    throw new ActionError(
      "already_settled",
      `cannot invoice a job that is already ${job.status}`,
      400,
    );
  }
  if (job.contractorInvoiceId) {
    throw new ActionError(
      "already_invoiced",
      `job already has Stripe invoice ${job.contractorInvoiceId}`,
      400,
    );
  }
  if (!job.assignedContractorId) {
    throw new ActionError("no_contractor", "job has no assigned contractor", 400);
  }
  const contractor = store.contractors.get(job.assignedContractorId);
  if (!contractor) throw new ActionError("contractor_not_found", "contractor not found", 404);

  const property = store.properties.get(job.propertyId);
  const owner = property ? store.people.get(property.ownerId) : undefined;
  if (!owner?.email) {
    throw new ActionError(
      "no_owner_email",
      `Property owner has no email on file; cannot bill them via Stripe`,
      400,
    );
  }

  const { invoiceId, hostedUrl } = await stripe.createInvoice({
    ownerEmail: owner.email,
    amountCents: input.amountCents,
    description: `${contractor.name} — ${job.title}`,
    jobId: job.id,
  });

  store.upsertJob({
    id: job.id,
    status: "awaiting_payment",
    totalCostCents: input.amountCents,
    contractorInvoiceId: invoiceId,
    contractorInvoiceUrl: hostedUrl,
  });

  store.appendEvent({
    jobId: job.id,
    kind: "invoice_sent",
    title: `Invoice received from ${contractor.name} — $${(input.amountCents / 100).toFixed(2)}`,
    detail: `Stripe invoice ${invoiceId}`,
    data: { amountCents: input.amountCents, invoiceId, hostedUrl },
  });

  await agentmail.sendEmail({
    to: owner.email,
    subject: `Invoice from ${contractor.name} — ${job.title}`,
    text: `Hi ${owner.name ?? "there"}, ${contractor.name} sent an invoice for "${job.title}" ($${(input.amountCents / 100).toFixed(2)}). Handle's agent will settle it via Sponge. Invoice: ${hostedUrl}`,
    tags: ["invoice", job.id],
  });

  return { invoiceId, hostedUrl, amountCents: input.amountCents };
}

// --- Pay contractor via Sponge ---
export interface PayContractorInput {
  jobId: string;
}
export interface PayContractorResult {
  txnHash: string;
}
export async function payContractor(
  input: PayContractorInput,
): Promise<PayContractorResult> {
  const job = getJobOrThrow(input.jobId);
  if (!job.assignedContractorId) {
    throw new ActionError("no_contractor", "job has no assigned contractor", 400);
  }
  if (!job.totalCostCents) {
    throw new ActionError("no_amount", "job has no invoice amount — send invoice first", 400);
  }
  const contractor = store.contractors.get(job.assignedContractorId);
  if (!contractor) throw new ActionError("contractor_not_found", "contractor not found", 404);
  if (!contractor.walletAddress) {
    throw new ActionError(
      "no_wallet",
      `Contractor ${contractor.name} has no wallet address on file`,
      400,
    );
  }

  const amountUsdc = job.totalCostCents / 100;
  const { txnHash } = await sponge.payContractor({
    toAddress: contractor.walletAddress,
    amountUsdc,
    memo: `Handle payment for job ${job.id}: ${job.title}`,
  });

  // Sync Stripe — mark the contractor's invoice as paid out-of-band so the
  // Stripe dashboard reflects the on-chain settlement.
  if (job.contractorInvoiceId) {
    try {
      await stripe.markInvoicePaidOutOfBand(job.contractorInvoiceId);
    } catch (err) {
      console.error("[payContractor] markInvoicePaidOutOfBand failed:", err);
    }
  }

  store.upsertJob({ id: job.id, status: "paid", paymentTxnHash: txnHash });
  store.appendEvent({
    jobId: job.id,
    kind: "paid",
    title: `Paid $${amountUsdc.toFixed(2)} via Sponge`,
    detail: `Txn: ${txnHash}`,
    data: { txnHash, amountUsdc },
  });

  return { txnHash };
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
  const phone = reporter?.phone;

  if (!phone) {
    store.appendEvent({
      jobId: job.id,
      kind: "survey_skipped",
      title: "Survey skipped",
      detail: "No phone number on file for tenant",
    });
    return { messageId: "no_phone" };
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sent = await agentphone.sendSms({
    to: phone,
    body: `Hi ${reporter.name ?? "there"}, how was the work on "${job.title}"? Rate it here: ${appUrl}/survey/${job.id}`,
  });

  store.upsertJob({ id: job.id, status: "awaiting_survey" });
  store.appendEvent({
    jobId: job.id,
    kind: "survey_sent",
    title: "Survey request sent",
    detail: `Texted ${phone}`,
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

  if (job.assignedContractorId) {
    try {
      await supermemory.remember({
        text: `survey_response contractor:${job.assignedContractorId} trade:${job.trade} property:${job.propertyId} score:${input.score}/5 — "${job.title}"${input.feedback ? ` — "${input.feedback}"` : ""}`,
        tags: [
          "survey_response",
          `contractor:${job.assignedContractorId}`,
          `property:${job.propertyId}`,
          `trade:${job.trade}`,
        ],
        metadata: {
          jobId: job.id,
          contractorId: job.assignedContractorId,
          propertyId: job.propertyId,
          trade: job.trade,
          score: input.score,
        },
      });
    } catch (err) {
      console.error("[supermemory] remember failed:", err);
    }
  }

  return { job: updated };
}

// --- Add a PM note to the job timeline ---
export interface AddNoteToJobInput {
  jobId: string;
  note: string;
}
export async function addNoteToJob(input: AddNoteToJobInput): Promise<void> {
  getJobOrThrow(input.jobId);
  store.appendEvent({
    jobId: input.jobId,
    kind: "note",
    title: "Note",
    detail: input.note,
  });
  revalidatePath(`/dashboard/jobs/${input.jobId}`);
}
