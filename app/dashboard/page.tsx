import { Briefcase, PhoneCall, Timer, Smile } from "lucide-react";
import { store } from "@/lib/store/memory";
import { StatTile } from "@/components/dashboard/stat-tile";
import { JobList } from "@/components/dashboard/job-list";
import { LiveCallCard } from "@/components/dashboard/live-call-card";

/**
 * Overview. Server-rendered first paint from the store; client polls every
 * 5s after hydration so the PM sees state changes without refreshing.
 */
export default function DashboardOverviewPage() {
  const jobs = store.listJobs();
  const calls = store.listCalls().slice(0, 5);
  const contractors = store.listContractors();
  const properties = Array.from(store.properties.values());

  const activeStatuses = new Set([
    "triaging",
    "sourcing_contractor",
    "scheduled",
    "in_progress",
    "awaiting_survey",
    "awaiting_payment",
  ]);
  const activeJobs = jobs.filter((j) => activeStatuses.has(j.status));
  const liveCalls = store
    .listCalls()
    .filter((c) => c.status === "in_progress" || c.status === "ringing").length;

  // Avg response time: time from first call_received event to first
  // contractor_assigned event across completed jobs.
  const completed = jobs.filter(
    (j) => j.status === "completed" && j.assignedContractorId,
  );
  let avgMinutes: number | null = null;
  if (completed.length > 0) {
    const totals: number[] = [];
    for (const job of completed) {
      const events = store.listJobEvents(job.id);
      const start = events.find((e) => e.kind === "call_received");
      const assigned =
        events.find((e) => e.kind === "contractor_assigned") ??
        events.find((e) => e.kind === "work_completed");
      if (start && assigned) {
        totals.push(
          (new Date(assigned.at).getTime() - new Date(start.at).getTime()) /
            60000,
        );
      }
    }
    if (totals.length > 0) {
      avgMinutes = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
    }
  }

  // Satisfaction: mean of satisfactionScore on completed jobs.
  const scored = jobs.filter((j) => typeof j.satisfactionScore === "number");
  const avgSat =
    scored.length > 0
      ? (
          scored.reduce((a, j) => a + (j.satisfactionScore ?? 0), 0) /
          scored.length
        ).toFixed(1)
      : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          What needs your attention right now. Updates every few seconds.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile
          label="Active jobs"
          value={activeJobs.length}
          delta={`${jobs.length} total`}
          icon={Briefcase}
        />
        <StatTile
          label="Live calls"
          value={liveCalls}
          delta={liveCalls > 0 ? "In progress now" : "Quiet line"}
          icon={PhoneCall}
        />
        <StatTile
          label="Avg response"
          value={avgMinutes !== null ? `${avgMinutes}m` : "—"}
          delta="Call to dispatch"
          icon={Timer}
        />
        <StatTile
          label="Satisfaction"
          value={avgSat ?? "—"}
          delta={scored.length > 0 ? `${scored.length} surveyed` : "Awaiting surveys"}
          icon={Smile}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Active jobs
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Sorted by urgency
            </span>
          </div>
          <JobList
            initialJobs={jobs}
            contractors={contractors}
            properties={properties}
          />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Recent calls
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Last {calls.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {calls.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No recent calls.
              </div>
            ) : (
              calls.map((c) => <LiveCallCard key={c.id} call={c} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
