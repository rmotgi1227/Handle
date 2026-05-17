import { JobList } from "@/components/dashboard/job-list";
import { store } from "@/lib/store/memory";
import type { Job } from "@/lib/types";

const ACTIVE_STATUSES: Job["status"][] = [
  "triaging",
  "sourcing_contractor",
  "scheduled",
  "in_progress",
  "awaiting_survey",
  "awaiting_payment",
];

const DONE_STATUSES: Job["status"][] = ["completed", "cancelled"];

export default function JobsPage() {
  const jobs = store.listJobs();
  const contractors = store.listContractors();
  const properties = Array.from(store.properties.values());

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const done = jobs.filter((j) => DONE_STATUSES.includes(j.status));

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Every job the agent has touched. {active.length} active · {done.length} closed.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium tracking-tight">Active</h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Sorted by urgency</span>
        </div>
        <JobList
          initialJobs={active}
          contractors={contractors}
          properties={properties}
          filterStatuses={ACTIVE_STATUSES}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium tracking-tight">Closed</h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">Most recent first</span>
        </div>
        {done.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No closed jobs yet.
          </div>
        ) : (
          <JobList
            initialJobs={done}
            contractors={contractors}
            properties={properties}
            filterStatuses={DONE_STATUSES}
          />
        )}
      </section>
    </div>
  );
}
