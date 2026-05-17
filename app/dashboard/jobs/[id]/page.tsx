import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  CheckCircle2,
  Receipt,
  MailQuestion,
  StickyNote,
  ChevronDown,
} from "lucide-react";
import { store } from "@/lib/store/memory";
import {
  createInvoiceForJob,
  markJobComplete,
  sendSurveyRequest,
} from "@/lib/orchestrator/actions";
import { UrgencyPill } from "@/components/dashboard/urgency-pill";
import { StatusPill } from "@/components/dashboard/status-pill";
import { JobTimeline } from "@/components/dashboard/job-timeline";
import { ContractorCard } from "@/components/dashboard/contractor-card";
import { Button } from "@/components/ui/button";

/**
 * Job detail. Server component — pulls straight from the in-memory store so
 * the first paint is instant. Action buttons use Next 16 server actions to
 * POST to internal route handlers (built by Subagent B).
 */
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

  // Server actions — call orchestrator functions directly (no HTTP round-trip,
  // no port assumptions). Revalidate the page after each so the timeline + status
  // update immediately. Tolerate ActionError so a missing-contractor invoice
  // attempt in v1 doesn't blow up the form post.
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
      // TODO: replace the placeholder amount with a real quote entry UI.
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

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        <ArrowLeft className="size-3.5" />
        Back to overview
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            <UrgencyPill urgency={job.urgency} />
            <StatusPill status={job.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {property ? (
            <span>
              Property:{" "}
              <span className="text-zinc-700 dark:text-zinc-200">
                {property.address}
                {property.unit ? ` · Unit ${property.unit}` : ""}
              </span>
            </span>
          ) : null}
          {reporter ? (
            <span>
              Reporter:{" "}
              <span className="text-zinc-700 dark:text-zinc-200">
                {reporter.name}
              </span>{" "}
              <span className="text-zinc-400">·</span> {reporter.phone}
            </span>
          ) : null}
        </div>
        {job.description ? (
          <p className="text-sm leading-snug text-zinc-700 dark:text-zinc-300">
            {job.description}
          </p>
        ) : null}
      </div>

      {job.visualContext && (
        <details
          open
          className="rounded border border-zinc-200 p-3 text-sm"
        >
          <summary className="cursor-pointer font-medium text-zinc-700">
            Visual triage
          </summary>
          <div className="mt-2 space-y-2">
            {/* Only render the image if the URL is a safe https:// URL */}
            {job.visualContext.mediaUrl.startsWith("https://") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.visualContext.mediaUrl}
                alt="Tenant photo"
                className="max-h-48 rounded object-cover"
              />
            )}
            <p className="text-zinc-600">{job.visualContext.description}</p>
            <p className="text-xs text-zinc-400">
              Severity: {job.visualContext.severity}
            </p>
          </div>
        </details>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">
            Timeline
          </h2>
          <JobTimeline events={events} />
        </section>

        <aside className="flex flex-col gap-4">
          {contractor ? (
            <div>
              <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Assigned contractor
              </h2>
              <ContractorCard contractor={contractor} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-300 p-5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              No contractor assigned yet — the agent is sourcing now.
            </div>
          )}

          {calls.length > 0 ? (
            <details className="group rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 py-4 text-sm font-medium tracking-tight">
                <span className="inline-flex items-center gap-2">
                  <Phone className="size-3.5 text-zinc-700 dark:text-zinc-300" />
                  Tenant call transcript
                </span>
                <ChevronDown className="size-4 text-zinc-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                {calls.map((call) => (
                  <div key={call.id} className="flex flex-col gap-2">
                    {call.transcript.map((line, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[auto_1fr] gap-x-3 text-xs leading-snug"
                      >
                        <span className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          {line.speaker}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {line.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </details>
          ) : null}

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <form action={markComplete}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start"
                >
                  <CheckCircle2 />
                  Mark complete
                </Button>
              </form>
              <form action={sendInvoice}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Receipt />
                  Send invoice
                </Button>
              </form>
              <form action={sendSurvey}>
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full justify-start"
                >
                  <MailQuestion />
                  Send survey
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                disabled
                title="Coming in v2"
              >
                <StickyNote />
                Add note
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
