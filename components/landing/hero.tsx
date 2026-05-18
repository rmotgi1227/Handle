import Link from "next/link";
import { ArrowRight, PhoneIncoming } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8E3DA] bg-[#F6F4EF]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #E8E3DA 1px, transparent 1px), linear-gradient(to bottom, #E8E3DA 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.6,
        }}
      />
      {/* Soft sunrise glow under the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-15%] size-[700px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,87,42,0.18), rgba(232,87,42,0) 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-8 pt-20 pb-24 md:grid-cols-[1.4fr_1fr] md:items-stretch md:pt-28 md:pb-24">
        <div>
          <div className="mb-10">
            <div className="inline-flex items-center gap-3 border border-[#E8572A] px-3 py-2">
              <span className="inline-flex size-7 shrink-0 items-center justify-center bg-[#E8572A] text-xs font-black text-white">
                Y
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8572A]">
                Built at YC · Call My Agent Hackathon
              </span>
            </div>
          </div>

          <h1 className="max-w-3xl text-balance text-6xl font-black leading-[1.02] tracking-tight text-[#15161A] md:text-7xl lg:text-8xl">
            Property maintenance, on autopilot.
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold uppercase tracking-[0.22em] text-[#9AA0A0]">
            <span>AI Dispatch</span>
            <span className="text-[#E8E3DA]">·</span>
            <span>Parallel Outreach</span>
            <span className="text-[#E8E3DA]">·</span>
            <span>Automated Payments</span>
          </div>

          <p className="mt-8 max-w-2xl text-balance text-lg font-medium leading-relaxed text-[#6B7070]">
            Your tenants call one number. Handle triages the issue, dials
            contractors in parallel, books the job, and pays them out — all
            before you&apos;ve checked Slack.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[#15161A] px-8 text-base font-bold text-[#F6F4EF] transition-colors hover:bg-[#2A2C30]"
            >
              Open dashboard <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-full border border-[#E8E3DA] bg-white px-8 text-base font-semibold text-[#15161A] transition-colors hover:bg-[#F6F4EF]"
            >
              See the full loop
            </Link>
          </div>
        </div>

        {/* Live "incoming call" card */}
        <div className="hidden md:flex md:items-stretch">
          <LiveCallCard />
        </div>
      </div>

      <StatsStrip />
    </section>
  );
}

function LiveCallCard() {
  return (
    <div className="relative w-full">
      <div
        aria-hidden
        className="absolute -inset-2 rounded-3xl bg-[#E8572A] opacity-[0.05] blur-2xl"
      />
      <div className="relative flex h-full flex-col rounded-3xl border border-[#E8E3DA] bg-white p-5 shadow-[0_2px_24px_rgba(21,22,26,0.08)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8572A] opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[#E8572A]" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#E8572A]">
              Live · incoming
            </span>
          </div>
          <PhoneIncoming className="size-4 text-[#9AA0A0]" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#F6F4EF] text-base font-black text-[#15161A]">
            MC
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#15161A]">
              Marcus Chen
            </p>
            <p className="truncate text-[13px] font-medium text-[#9AA0A0]">
              342 Valencia St, Unit 3B
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-end gap-[3px] overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="inline-block w-[3px] rounded-full bg-[#15161A]"
              style={{
                height: `${18 + ((i * 13) % 28)}px`,
                opacity: 0.7,
                animation: `cma-wave 1.2s ease-in-out ${i * 0.04}s infinite`,
              }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-1.5 text-[13px] font-medium leading-snug text-[#6B7070]">
          <Line label="Intent" value="General · wall patch + repaint" hot />
          <Line label="Urgency" value="Urgent · move-out inspection Friday" />
          <Line label="Recall" value="Moss · 6 candidates · 8ms" />
          <Line label="Quote" value="Bay Area Wall Fixes · $200 · ETA 3–5pm" />
          <Line
            label="Status"
            value="Dialing 3 contractors in parallel"
            blink
          />
        </div>

        {/* Bottom action ticker — fills the rest of the column height and
            telegraphs the next steps the agent is teeing up. */}
        <div className="mt-auto pt-5">
          <div className="rounded-2xl border border-[#E8E3DA] bg-[#F6F4EF] p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA0A0]">
              Next up
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] font-medium text-[#6B7070]">
              <TickerRow label="Notify owner" value="AgentMail · 1 line · pre-dispatch" />
              <TickerRow label="Generate invoice" value="Stripe · $200 · finalize on completion" />
              <TickerRow label="Pay contractor" value="Sponge · USDC on Solana" />
            </ul>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes cma-wave {
          0%, 100% { transform: scaleY(0.45); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

function TickerRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 font-bold text-[#15161A]">{label}</span>
      <span className="min-w-0 truncate text-right">{value}</span>
    </li>
  );
}

function Line({
  label,
  value,
  hot,
  blink,
}: {
  label: string;
  value: string;
  hot?: boolean;
  blink?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA0A0]">
        {label}
      </span>
      <span
        className={`min-w-0 flex-1 truncate font-semibold ${
          hot ? "text-[#E8572A]" : "text-[#15161A]"
        }`}
      >
        {blink ? (
          <>
            <span className="mr-1.5 inline-block size-1.5 -translate-y-0.5 animate-pulse rounded-full bg-[#3B5A78]" />
            {value}
          </>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

function StatsStrip() {
  const stats: Array<{ value: string; label: string; source?: string }> = [
    {
      value: "$51.5B",
      label: "Deferred repair backlog in US rental housing",
      source: "Fed. Reserve Bank of Philadelphia",
    },
    {
      value: "20+ hrs",
      label: "Per month 39% of PMs spend on contractor phone tag",
      source: "Buildium 2024",
    },
    { value: "<2s", label: "Triage latency · pick-up to dispatch" },
    { value: "<10ms", label: "Contractor catalog recall (Moss)" },
  ];
  return (
    <div className="relative mx-auto max-w-6xl border-t border-[#E8E3DA] px-8">
      <dl className="grid grid-cols-2 divide-y divide-[#E8E3DA] sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-6 sm:py-7">
            <dd className="text-3xl font-black tracking-tight text-[#15161A] md:text-4xl">
              {s.value}
            </dd>
            <dt className="mt-2 text-[11px] font-medium leading-snug text-[#6B7070]">
              {s.label}
            </dt>
            {s.source ? (
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9AA0A0]">
                {s.source}
              </p>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}
