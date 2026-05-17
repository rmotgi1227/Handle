import Link from "next/link";
import { LayoutGrid, Briefcase, Users, Settings, PhoneIncoming, Timer, Smile, PhoneCall, ChevronDown, ArrowLeft } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";
import { getDashboardData, jobMeta, relativeTime } from "../../_data";
import { UrgencyPill } from "@/components/dashboard/urgency-pill";
import { StatusPill } from "@/components/dashboard/status-pill";

const BG = "#15161A";
const PANEL = "#1E2028";
const PANEL2 = "#22252B";
const LINE = "#2A2C32";
const CREAM = "#F6F4EF";
const BLUE = "#3B5A78";
const BLUE_BRIGHT = "#5B82A8";
const MUTE = "#8A9090";

export default function V2Dashboard() {
  const { activeJobs, recentCalls, contractors, properties, stats } = getDashboardData();

  return (
    <div className="flex h-screen" style={{ background: BG, color: CREAM }}>
      <aside className="flex w-[220px] shrink-0 flex-col border-r" style={{ borderColor: LINE, background: BG }}>
        <div className="px-6 py-6">
          <HandleLogo variant="wordmark-on-dark" width={92} height={24} priority />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {[
            { label: "Overview", icon: LayoutGrid, active: true },
            { label: "Jobs", icon: Briefcase },
            { label: "Contractors", icon: Users },
            { label: "Settings", icon: Settings },
          ].map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: active ? PANEL2 : "transparent",
                color: active ? CREAM : MUTE,
                border: active ? `1px solid ${LINE}` : "1px solid transparent",
              }}
            >
              <Icon className="size-4" style={{ color: active ? BLUE_BRIGHT : MUTE }} />
              {label}
            </button>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs" style={{ color: MUTE }}>v2 · Dark · Calm</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b px-8" style={{ borderColor: LINE, background: BG }}>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium"
            style={{ borderColor: LINE, background: PANEL, color: CREAM }}
          >
            All properties
            <ChevronDown className="size-3.5" style={{ color: MUTE }} />
          </button>
          <Link href="/preview" className="ml-auto inline-flex items-center gap-1 text-xs" style={{ color: MUTE }}>
            <ArrowLeft className="size-3.5" /> Back to variants
          </Link>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: stats.liveCalls > 0 ? BLUE : LINE,
              background: stats.liveCalls > 0 ? "rgba(59,90,120,0.2)" : PANEL,
              color: stats.liveCalls > 0 ? BLUE_BRIGHT : MUTE,
            }}
          >
            {stats.liveCalls > 0 ? (
              <>
                <span className="relative inline-flex size-1.5">
                  <span className="absolute inset-0 rounded-full opacity-70 motion-safe:animate-ping" style={{ background: BLUE_BRIGHT }} />
                  <span className="relative size-1.5 rounded-full" style={{ background: BLUE_BRIGHT }} />
                </span>
                <span className="tabular-nums">{stats.liveCalls} live</span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full" style={{ background: LINE }} />
                No live calls
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: "#17191E" }}>
          <div className="mx-auto max-w-7xl px-8 py-10">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
              <p className="mt-1.5 text-sm" style={{ color: MUTE }}>What needs your attention right now.</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: "Active jobs", value: stats.activeJobs, sub: `${stats.totalJobs} total`, Icon: Briefcase },
                { label: "Live calls", value: stats.liveCalls, sub: stats.liveCalls > 0 ? "In progress" : "Quiet line", Icon: PhoneCall },
                { label: "Avg response", value: stats.avgMinutes !== null ? `${stats.avgMinutes}m` : "—", sub: "Call to dispatch", Icon: Timer },
                { label: "Satisfaction", value: stats.avgSat ?? "—", sub: stats.surveyed > 0 ? `${stats.surveyed} surveyed` : "Awaiting", Icon: Smile },
              ].map(({ label, value, sub, Icon }) => (
                <div key={label} className="rounded-2xl p-6" style={{ background: PANEL, border: `1px solid ${LINE}` }}>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: MUTE }}>{label}</span>
                    <Icon className="size-4" style={{ color: BLUE_BRIGHT }} />
                  </div>
                  <div className="mt-4 text-4xl font-semibold tracking-tight tabular-nums" style={{ color: CREAM }}>{value}</div>
                  <div className="mt-1.5 text-xs" style={{ color: MUTE }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Active jobs</h2>
                  <span className="text-xs" style={{ color: MUTE }}>Sorted by urgency</span>
                </div>
                <div className="flex flex-col gap-3">
                  {activeJobs.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-10 text-center text-sm" style={{ borderColor: LINE, color: MUTE }}>No active jobs.</div>
                  ) : activeJobs.map((job) => {
                    const { contractor, property } = jobMeta(job, contractors, properties);
                    return (
                      <div key={job.id} className="rounded-2xl p-5 transition-colors" style={{ background: PANEL, border: `1px solid ${LINE}` }}>
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold" style={{ color: CREAM }}>{job.title}</div>
                            <div className="mt-0.5 truncate text-xs" style={{ color: MUTE }}>
                              {property ? `${property.address}${property.unit ? ` · Unit ${property.unit}` : ""}` : "Unknown property"}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <UrgencyPill urgency={job.urgency} />
                            <StatusPill status={job.status} />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: MUTE }}>
                          <span style={{ color: contractor ? CREAM : MUTE }}>{contractor ? contractor.name : "Sourcing…"}</span>
                          <span style={{ color: LINE }}>·</span>
                          <span className="tabular-nums">{relativeTime(job.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Recent calls</h2>
                  <span className="text-xs" style={{ color: MUTE }}>Last {recentCalls.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {recentCalls.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-center text-xs" style={{ borderColor: LINE, color: MUTE }}>No recent calls.</div>
                  ) : recentCalls.map((c) => {
                    const live = c.status === "in_progress" || c.status === "ringing";
                    return (
                      <div key={c.id} className="rounded-2xl p-4" style={{ background: PANEL, border: `1px solid ${LINE}` }}>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-full" style={{ background: "rgba(59,90,120,0.25)", color: BLUE_BRIGHT }}>
                            <PhoneIncoming className="size-3.5" />
                          </span>
                          {live && <span className="size-1.5 rounded-full motion-safe:animate-pulse" style={{ background: BLUE_BRIGHT }} />}
                          <span className="text-sm font-medium" style={{ color: CREAM }}>{c.fromNumber}</span>
                          <span className="ml-auto text-xs tabular-nums" style={{ color: MUTE }}>{relativeTime(c.startedAt)}</span>
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs leading-snug" style={{ color: MUTE }}>
                          {c.summary ?? c.transcript[c.transcript.length - 1]?.text ?? "Connecting…"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
