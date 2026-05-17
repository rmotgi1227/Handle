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
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#15161A]">Jobs</h1>
        <p className="mt-1 text-sm font-medium text-[#6B7070]">
          Every job the agent has touched.{" "}
          <span className="font-bold text-[#15161A]">{active.length} active</span>
          {" · "}
          <span>{done.length} closed</span>
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#15161A]">Active</h2>
          <span className="text-xs font-medium text-[#9AA0A0]">Sorted by urgency</span>
        </div>
        <JobList initialJobs={active} contractors={contractors} properties={properties} filterStatuses={ACTIVE_STATUSES} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#15161A]">Closed</h2>
          <span className="text-xs font-medium text-[#9AA0A0]">Most recent first</span>
        </div>
        {done.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-10 text-center text-sm font-medium text-[#9AA0A0]">
            No closed jobs yet.
          </div>
        ) : (
          <JobList initialJobs={done} contractors={contractors} properties={properties} filterStatuses={DONE_STATUSES} />
        )}
      </section>
    </div>
  );
}
