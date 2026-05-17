import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  ArrowLeft, Phone, CheckCircle2, Receipt, MailQuestion, StickyNote, ChevronDown, Banknote,
} from "lucide-react";
import { store } from "@/lib/store/memory";
import { createInvoiceForJob, markJobComplete, sendSurveyRequest, addNoteToJob, payContractor } from "@/lib/orchestrator/actions";
import { UrgencyPill } from "@/components/dashboard/urgency-pill";
import { StatusPill } from "@/components/dashboard/status-pill";
import { JobTimeline } from "@/components/dashboard/job-timeline";
import { ContractorCard } from "@/components/dashboard/contractor-card";
import { AddNoteButton } from "@/components/dashboard/add-note-button";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = store.getJob(id);
  if (!job) notFound();

  const events = store.listJobEvents(id);
  const property = store.properties.get(job.propertyId);
  const reporter = store.people.get(job.reportedByPersonId);
  const contractor = job.assignedContractorId
    ? store.contractors.get(job.assignedContractorId)
    : undefined;

  const calls = job.callIds
    .map((cid) => store.calls.get(cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  async function markComplete() {
    "use server";
    try {
      await markJobComplete({ jobId: id, note: "Marked complete by PM" });
      revalidatePath(`/dashboard/jobs/${id}`);
    } catch (err) {
      console.error("[markComplete]", err);
    }
  }
  async function sendInvoice() {
    "use server";
    try {
      await createInvoiceForJob({ jobId: id, amountCents: 18500 });
      revalidatePath(`/dashboard/jobs/${id}`);
    } catch (err) {
      console.error("[sendInvoice]", err);
    }
  }
  async function sendSurvey() {
    "use server";
    try {
      await sendSurveyRequest({ jobId: id });
      revalidatePath(`/dashboard/jobs/${id}`);
    } catch (err) {
      console.error("[sendSurvey]", err);
    }
  }
  async function addNote(note: string) {
    "use server";
    try {
      await addNoteToJob({ jobId: id, note });
      revalidatePath(`/dashboard/jobs/${id}`);
    } catch (err) {
      console.error("[addNote]", err);
    }
  }
  async function executePayment() {
    "use server";
    try {
      await payContractor({ jobId: id });
      revalidatePath(`/dashboard/jobs/${id}`);
    } catch (err) {
      console.error("[executePayment]", err);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9AA0A0] hover:text-[#15161A]"
      >
        <ArrowLeft className="size-3.5" />
        Back to jobs
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight text-[#15161A]">{job.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <UrgencyPill urgency={job.urgency} />
            <StatusPill status={job.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[#9AA0A0]">
          {property ? (
            <span>
              Property:{" "}
              <span className="font-semibold text-[#15161A]">
                {property.address}{property.unit ? ` · Unit ${property.unit}` : ""}
              </span>
            </span>
          ) : null}
          {reporter ? (
            <span>
              Reporter:{" "}
              <span className="font-semibold text-[#15161A]">{reporter.name}</span>
              {" · "}
              <span>{reporter.phone}</span>
            </span>
          ) : null}
        </div>
        {job.description ? (
          <p className="text-sm font-medium leading-snug text-[#6B7070]">{job.description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section
          className="rounded-2xl border border-[#E8E3DA] bg-white p-6"
          style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
        >
          <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-[#6B7070]">Timeline</h2>
          <JobTimeline events={events} />
        </section>

        <aside className="flex flex-col gap-4">
          {contractor ? (
            <div>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">
                Assigned contractor
              </h2>
              <ContractorCard contractor={contractor} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-5 text-xs font-medium text-[#9AA0A0]">
              No contractor assigned yet — the agent is sourcing now.
            </div>
          )}

          {calls.length > 0 ? (
            <details className="group rounded-2xl border border-[#E8E3DA] bg-white" style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm font-semibold text-[#15161A]">
                <span className="inline-flex items-center gap-2">
                  <Phone className="size-3.5 text-[#3B5A78]" />
                  Tenant call transcript
                </span>
                <ChevronDown className="size-4 text-[#9AA0A0] transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-[#E8E3DA] px-5 py-4">
                {calls.map((call) => (
                  <div key={call.id} className="flex flex-col gap-2">
                    {call.transcript.map((line, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr] gap-x-3 text-xs leading-snug">
                        <span className="font-bold uppercase tracking-wide text-[#9AA0A0]">
                          {line.speaker}
                        </span>
                        <span className="font-medium text-[#6B7070]">{line.text}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          <div
            className="rounded-2xl border border-[#E8E3DA] bg-white p-5"
            style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
          >
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">
              Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <form action={markComplete}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-xs font-semibold text-[#15161A] transition-colors hover:bg-[#EEEBE4] hover:border-[#D5CFC6]"
                >
                  <CheckCircle2 className="size-3.5 text-[#3B5A78]" />
                  Mark complete
                </button>
              </form>
              <form action={sendInvoice}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-xs font-semibold text-[#15161A] transition-colors hover:bg-[#EEEBE4] hover:border-[#D5CFC6]"
                >
                  <Receipt className="size-3.5 text-[#3B5A78]" />
                  Send invoice
                </button>
              </form>
              <form action={sendSurvey}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-xs font-semibold text-[#15161A] transition-colors hover:bg-[#EEEBE4] hover:border-[#D5CFC6]"
                >
                  <MailQuestion className="size-3.5 text-[#3B5A78]" />
                  Send survey
                </button>
              </form>
              <AddNoteButton action={addNote} />
              {job.status === "awaiting_payment" && contractor?.walletAddress ? (
                <form action={executePayment} className="col-span-2">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3B5A78] bg-[#EEF4F9] px-3 py-2.5 text-xs font-bold text-[#3B5A78] transition-colors hover:bg-[#3B5A78] hover:text-white"
                  >
                    <Banknote className="size-3.5" />
                    Pay contractor via Sponge
                    {job.totalCostCents ? ` — $${(job.totalCostCents / 100).toFixed(2)}` : ""}
                  </button>
                </form>
              ) : null}
              {job.paymentTxnHash ? (
                <div className="col-span-2 flex items-center gap-2 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-xs font-medium text-[#6B7070]">
                  <Banknote className="size-3.5 shrink-0 text-[#3B5A78]" />
                  <span className="truncate">Paid · {job.paymentTxnHash}</span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
