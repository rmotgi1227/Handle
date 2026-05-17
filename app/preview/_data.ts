import { store } from "@/lib/store/memory";
import type { Job, JobUrgency } from "@/lib/types";

const URGENCY_RANK: Record<JobUrgency, number> = {
  emergency: 0,
  urgent: 1,
  standard: 2,
  scheduled: 3,
};

const ACTIVE = new Set([
  "triaging",
  "sourcing_contractor",
  "scheduled",
  "in_progress",
  "awaiting_survey",
  "awaiting_payment",
]);

export function getDashboardData() {
  const jobs = store.listJobs();
  const calls = store.listCalls();
  const contractors = store.listContractors();
  const properties = Array.from(store.properties.values());

  const activeJobs = jobs
    .filter((j) => ACTIVE.has(j.status))
    .sort((a, b) => {
      const ru = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (ru !== 0) return ru;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const liveCallCount = calls.filter(
    (c) => c.status === "in_progress" || c.status === "ringing",
  ).length;

  let avgMinutes: number | null = null;
  const completed = jobs.filter(
    (j) => j.status === "completed" && j.assignedContractorId,
  );
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
      avgMinutes = Math.round(
        totals.reduce((a, b) => a + b, 0) / totals.length,
      );
    }
  }

  const scored = jobs.filter((j) => typeof j.satisfactionScore === "number");
  const avgSat: string | null =
    scored.length > 0
      ? (
          scored.reduce((a, j) => a + (j.satisfactionScore ?? 0), 0) /
          scored.length
        ).toFixed(1)
      : null;

  return {
    jobs,
    activeJobs,
    recentCalls: calls.slice(0, 5),
    contractors,
    properties,
    stats: {
      activeJobs: activeJobs.length,
      totalJobs: jobs.length,
      liveCalls: liveCallCount,
      avgMinutes,
      avgSat,
      surveyed: scored.length,
    },
  };
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function jobMeta(job: Job, allContractors: ReturnType<typeof getDashboardData>["contractors"], allProperties: ReturnType<typeof getDashboardData>["properties"]) {
  const contractor = job.assignedContractorId
    ? allContractors.find((c) => c.id === job.assignedContractorId)
    : undefined;
  const property = allProperties.find((p) => p.id === job.propertyId);
  return { contractor, property };
}
