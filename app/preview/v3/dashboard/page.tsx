import Link from "next/link";
import { LayoutGrid, Briefcase, Users, Settings, PhoneIncoming, Timer, Smile, PhoneCall, ChevronDown, ArrowLeft, Search } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";
import { getDashboardData, jobMeta, relativeTime } from "../../_data";

const INK = "#15161A";
const BLUE = "#3B5A78";
const MUTE = "#6B7070";
const BORDER = "#E5E7EB";
const BG = "#F9FAFB";

const URGENCY_COLOR: Record<string, string> = {
  emergency: "#B91C1C",
  urgent: "#D97706",
  standard: "#3B5A78",
  scheduled: "#6B7070",
};

export default function V3Dashboard() {
  const { activeJobs, recentCalls, contractors, properties, stats } = getDashboardData();

  return (
    <div className="flex h-screen flex-col bg-white" style={{ color: INK }}>
      {/* Top nav */}
      <header className="flex h-14 items-center gap-6 border-b bg-white px-6" style={{ borderColor: BORDER }}>
        <HandleLogo variant="wordmark-on-light" width={90} height={22} priority />
        <nav className="hidden items-center gap-0.5 md:flex">
          {[
            { label: "Overview", active: true },
            { label: "Jobs" },
            { label: "Contractors" },
            { label: "Settings" },
          ].map(({ label, active }) => (
            <button
              key={label}
              className="rounded-md px-3 py-1.5 text-sm font-medium"
              style={{
                background: active ? BG : "transparent",
                color: active ? INK : MUTE,
                border: active ? `1px solid ${BORDER}` : "1px solid transparent",
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs md:flex" style={{ borderColor: BORDER, color: MUTE }}>
            <Search className="size-3.5" />
            Search
            <kbd className="rounded border px-1 text-[10px]" style={{ borderColor: BORDER }}>⌘K</kbd>
          </div>
          <Link href="/preview" className="inline-flex items-center gap-1 text-xs" style={{ color: MUTE }}>
            <ArrowLeft className="size-3.5" /> Variants
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: BORDER, color: INK }}
          >
            All properties <ChevronDown className="size-3.5" style={{ color: MUTE }} />
          </button>
          <div
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{
              borderColor: stats.liveCalls > 0 ? "#C7D9E8" : BORDER,
              background: stats.liveCalls > 0 ? "#EEF4F9" : BG,
              color: stats.liveCalls > 0 ? BLUE : MUTE,
            }}
          >
            {stats.liveCalls > 0 ? (
              <>
                <span className="relative inline-flex size-1.5">
                  <span className="absolute inset-0 rounded-full opacity-70 motion-safe:animate-ping" style={{ background: BLUE }} />
                  <span className="relative size-1.5 rounded-full" style={{ background: BLUE }} />
                </span>
                {stats.liveCalls} live
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full" style={{ background: BORDER }} />
                No live calls
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ background: BG }}>
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
            <p className="mt-1 text-sm" style={{ color: MUTE }}>What needs your attention right now.</p>
          </div>

          {/* KPI row */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Active jobs", value: stats.activeJobs, sub: `${stats.totalJobs} total`, Icon: Briefcase },
              { label: "Live calls", value: stats.liveCalls, sub: stats.liveCalls > 0 ? "In progress" : "Quiet line", Icon: PhoneCall },
              { label: "Avg response", value: stats.avgMinutes !== null ? `${stats.avgMinutes}m` : "—", sub: "Call to dispatch", Icon: Timer },
              { label: "Satisfaction", value: stats.avgSat ?? "—", sub: stats.surveyed > 0 ? `${stats.surveyed} surveyed` : "Awaiting", Icon: Smile },
            ].map(({ label, value, sub, Icon }) => (
              <div key={label} className="rounded-xl border bg-white p-5" style={{ borderColor: BORDER }}>
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: MUTE }}>{label}</span>
                  <Icon className="size-4" style={{ color: BLUE }} />
                </div>
                <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
                <div className="mt-1 text-xs" style={{ color: MUTE }}>{sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
            {/* Jobs table */}
            <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: BORDER }}>
                <h2 className="text-sm font-semibold">Active jobs</h2>
                <span className="text-xs" style={{ color: MUTE }}>Sorted by urgency · {activeJobs.length} total</span>
              </div>
              {/* Table header */}
              <div
                className="grid grid-cols-[100px_1fr_160px_130px_80px] gap-3 border-b px-5 py-2 text-[11px] font-medium uppercase tracking-wider"
                style={{ borderColor: BORDER, color: MUTE, background: BG }}
              >
                <span>Urgency</span>
                <span>Job · Property</span>
                <span>Contractor</span>
                <span>Status</span>
                <span className="text-right">Age</span>
              </div>
              {activeJobs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: MUTE }}>No active jobs.</div>
              ) : activeJobs.map((job, idx) => {
                const { contractor, property } = jobMeta(job, contractors, properties);
                const ucolor = URGENCY_COLOR[job.urgency] ?? MUTE;
                return (
                  <div
                    key={job.id}
                    className="grid grid-cols-[100px_1fr_160px_130px_80px] items-center gap-3 px-5 py-3 text-sm hover:bg-gray-50"
                    style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}
                  >
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium capitalize" style={{ color: ucolor }}>
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: ucolor }} />
                      {job.urgency}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{job.title}</div>
                      <div className="truncate text-xs" style={{ color: MUTE }}>
                        {property ? `${property.address}${property.unit ? ` · ${property.unit}` : ""}` : "—"}
                      </div>
                    </div>
                    <span className="truncate text-sm" style={{ color: contractor ? INK : MUTE }}>
                      {contractor ? contractor.name : "Sourcing…"}
                    </span>
                    <span className="text-xs capitalize" style={{ color: MUTE }}>
                      {job.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-right text-xs tabular-nums" style={{ color: MUTE }}>
                      {relativeTime(job.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Calls */}
            <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between border-b px-5 py-3.5" style={{ borderColor: BORDER }}>
                <h2 className="text-sm font-semibold">Recent calls</h2>
                <span className="text-xs" style={{ color: MUTE }}>Last {recentCalls.length}</span>
              </div>
              {recentCalls.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm" style={{ color: MUTE }}>No recent calls.</div>
              ) : recentCalls.map((c, idx) => {
                const live = c.status === "in_progress" || c.status === "ringing";
                return (
                  <div
                    key={c.id}
                    className="px-5 py-4 hover:bg-gray-50"
                    style={{ borderTop: idx === 0 ? "none" : `1px solid ${BORDER}` }}
                  >
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: BORDER, color: BLUE }}>
                        <PhoneIncoming className="size-3.5" />
                      </span>
                      {live && <span className="size-1.5 rounded-full motion-safe:animate-pulse" style={{ background: BLUE }} />}
                      <span className="font-medium">{c.fromNumber}</span>
                      <span className="ml-auto text-xs tabular-nums" style={{ color: MUTE }}>{relativeTime(c.startedAt)}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-2 pl-9 text-xs leading-snug" style={{ color: MUTE }}>
                      {c.summary ?? c.transcript[c.transcript.length - 1]?.text ?? "Connecting…"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
