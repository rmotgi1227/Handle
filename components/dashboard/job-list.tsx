"use client";

import Link from "next/link";
import {
  Droplet,
  Zap,
  Wind,
  Wrench,
  Key,
  Bug,
  Sparkles,
  Hammer,
  Home,
  Trees,
  Loader2,
} from "lucide-react";
import { usePollingFetch } from "@/hooks/use-polling-fetch";
import { UrgencyPill } from "./urgency-pill";
import { StatusPill } from "./status-pill";
import type { Job, JobUrgency, Trade, Contractor, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type JobsResponse = { jobs: Job[] };

const tradeIcon: Record<Trade, typeof Droplet> = {
  plumbing: Droplet,
  electrical: Zap,
  hvac: Wind,
  appliance: Wrench,
  locksmith: Key,
  pest_control: Bug,
  cleaning: Sparkles,
  general: Hammer,
  roofing: Home,
  landscaping: Trees,
};

const urgencyRank: Record<JobUrgency, number> = {
  emergency: 0,
  urgent: 1,
  standard: 2,
  scheduled: 3,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function JobList({
  initialJobs,
  contractors,
  properties,
  filterStatuses,
}: {
  initialJobs: Job[];
  contractors: Contractor[];
  properties: Property[];
  /** Restrict polled data to these statuses (after the polling refresh
   * replaces initialJobs with all jobs). Lets one component back both an
   * "Active" and "Closed" section on /dashboard/jobs without one eating
   * the other. */
  filterStatuses?: Job["status"][];
}) {
  // Only `/api/jobs` is part of the v1 API surface; contractors and
  // properties are stable enough to ship once at first paint. Re-renders
  // come for free as `/api/jobs` ticks.
  const jobsRes = usePollingFetch<JobsResponse>("/api/jobs", 5000);

  const allJobs = jobsRes.data?.jobs ?? initialJobs;
  const jobs = filterStatuses
    ? allJobs.filter((j) => filterStatuses.includes(j.status))
    : allJobs;
  const contractorList = contractors;
  const propertyList = properties;

  const contractorById = new Map(contractorList.map((c) => [c.id, c]));
  const propertyById = new Map(propertyList.map((p) => [p.id, p]));

  const sorted = [...jobs].sort((a, b) => {
    const ru = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (ru !== 0) return ru;
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No active jobs. New tenant calls will appear here within seconds.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((job) => {
        const Icon = tradeIcon[job.trade] ?? Hammer;
        const contractor = job.assignedContractorId
          ? contractorById.get(job.assignedContractorId)
          : undefined;
        const property = propertyById.get(job.propertyId);
        const sourcing =
          !contractor &&
          (job.status === "triaging" || job.status === "sourcing_contractor");

        return (
          <Link
            key={job.id}
            href={`/dashboard/jobs/${job.id}`}
            className={cn(
              "group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
            )}
          >
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <Icon className="size-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
                    {job.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {property
                      ? `${property.address}${property.unit ? ` · Unit ${property.unit}` : ""}`
                      : "Unknown property"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <UrgencyPill urgency={job.urgency} />
                  <StatusPill status={job.status} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                {sourcing ? (
                  <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                    <Loader2 className="size-3 animate-spin" />
                    Sourcing…
                  </span>
                ) : contractor ? (
                  <span className="truncate text-zinc-700 dark:text-zinc-200">
                    {contractor.name}
                  </span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">Unassigned</span>
                )}
                <span className="text-zinc-300 dark:text-zinc-700">·</span>
                <span className="tabular-nums">{relativeTime(job.createdAt)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
