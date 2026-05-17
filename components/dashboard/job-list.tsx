"use client";

import Link from "next/link";
import {
  Droplet, Zap, Wind, Wrench, Key, Bug, Sparkles, Hammer, Home, Trees, Loader2,
} from "lucide-react";
import { usePollingFetch } from "@/hooks/use-polling-fetch";
import { UrgencyPill } from "./urgency-pill";
import { StatusPill } from "./status-pill";
import type { Job, JobUrgency, Trade, Contractor, Property } from "@/lib/types";

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
  variant = "card",
}: {
  initialJobs: Job[];
  contractors: Contractor[];
  properties: Property[];
  filterStatuses?: Job["status"][];
  variant?: "card" | "row";
}) {
  const jobsRes = usePollingFetch<JobsResponse>("/api/jobs", 5000);

  const allJobs = jobsRes.data?.jobs ?? initialJobs;
  const jobs = filterStatuses
    ? allJobs.filter((j) => filterStatuses.includes(j.status))
    : allJobs;

  const contractorById = new Map(contractors.map((c) => [c.id, c]));
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  const sorted = [...jobs].sort((a, b) => {
    const ru = urgencyRank[a.urgency] - urgencyRank[b.urgency];
    if (ru !== 0) return ru;
    return b.createdAt.localeCompare(a.createdAt);
  });

  if (sorted.length === 0) {
    if (variant === "row") {
      return (
        <div className="px-5 py-10 text-center text-sm font-medium text-[#9AA0A0]">
          No jobs here. New tenant calls will appear within seconds.
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-10 text-center text-sm font-medium text-[#9AA0A0]">
        No jobs here. New tenant calls will appear within seconds.
      </div>
    );
  }

  const isRow = variant === "row";
  const wrapperClass = isRow
    ? "flex flex-col divide-y divide-[#E8E3DA]"
    : "flex flex-col gap-3";
  const itemClass = isRow
    ? "group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[#FAF8F3]"
    : "group flex items-start gap-4 rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-all hover:-translate-y-px hover:border-[#D5CFC6]";

  return (
    <div className={wrapperClass}>
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
            className={itemClass}
            style={isRow ? undefined : { boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
          >
            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E8E3DA] bg-[#F6F4EF]">
              <Icon className="size-4 text-[#3B5A78]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold tracking-tight text-[#15161A]">
                    {job.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-medium text-[#9AA0A0]">
                    {property
                      ? `${property.address}${job.unitLabel ? ` · Unit ${job.unitLabel}` : property.unit ? ` · Unit ${property.unit}` : ""}`
                      : "Unknown property"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <UrgencyPill urgency={job.urgency} />
                  <StatusPill status={job.status} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs font-medium text-[#9AA0A0]">
                {sourcing ? (
                  <span className="inline-flex items-center gap-1.5 text-[#3B5A78]">
                    <Loader2 className="size-3 animate-spin" />
                    Sourcing…
                  </span>
                ) : contractor ? (
                  <span className="truncate text-[#6B7070]">{contractor.name}</span>
                ) : (
                  <span>Unassigned</span>
                )}
                <span className="text-[#E8E3DA]">·</span>
                <span className="tabular-nums" suppressHydrationWarning>{relativeTime(job.createdAt)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
