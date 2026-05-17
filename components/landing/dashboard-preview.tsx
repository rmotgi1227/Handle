import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Phone,
  ListChecks,
  Users,
  Wallet,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

type Highlight = {
  k: string;
  v: string;
  hint: string;
  Icon: LucideIcon;
};

const HIGHLIGHTS: Highlight[] = [
  {
    k: "Live calls",
    v: "Streaming transcripts as they happen",
    hint: "Sub-second relay",
    Icon: Phone,
  },
  {
    k: "Triaged jobs",
    v: "Urgency, trade, and recall context per call",
    hint: "Auto-classified",
    Icon: ListChecks,
  },
  {
    k: "Contractor race",
    v: "Watch three dial-outs in parallel",
    hint: "3× parallel",
    Icon: Users,
  },
  {
    k: "Payments",
    v: "Sponge invoice + payout, one click",
    hint: "USDC settled",
    Icon: Wallet,
  },
];

export function DashboardPreview() {
  return (
    <section
      id="preview"
      className="relative w-full border-b border-[#E8E3DA] bg-[#EEEBE4] py-24 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-12 flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DA] bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
            <Sparkles className="size-3" /> Inside the dashboard
          </span>
          <h2 className="max-w-3xl text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
            Calm operations console.
          </h2>
          <p className="max-w-2xl text-base font-medium leading-relaxed text-[#6B7070]">
            One pane for every property. Watch calls come in, see what the agent
            decided, and only step in when you actually want to.
          </p>
          <Link
            href="/dashboard"
            className="group mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-[#15161A] hover:text-[#3B5A78]"
          >
            Open dashboard
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-[#E8E3DA] bg-white shadow-[0_12px_56px_rgba(21,22,26,0.12)]">
          <div className="flex items-center justify-between border-b border-[#E8E3DA] bg-[#F6F4EF] px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#FF5F57]" />
              <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
              <span className="size-2.5 rounded-full bg-[#28C840]" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9AA0A0]">
              handle.app/dashboard
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3B5A78] opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#3B5A78]" />
              </span>
              Live mode
            </span>
          </div>
          <div className="relative aspect-[16/9] w-full">
            <Image
              src="/dashboard-preview.png"
              alt="Handle dashboard preview"
              fill
              sizes="(min-width: 1280px) 1152px, 100vw"
              className="object-cover object-top"
              priority={false}
            />
          </div>
        </div>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ k, v, hint, Icon }) => (
            <li
              key={k}
              className="group flex flex-col gap-3 rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#3B5A78]/30 hover:shadow-[0_8px_24px_rgba(21,22,26,0.08)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#F6F4EF] text-[#3B5A78] transition-colors group-hover:bg-[#3B5A78] group-hover:text-white">
                  <Icon className="size-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">
                  {hint}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
                  {k}
                </p>
                <p className="mt-1 text-[15px] font-bold leading-snug text-[#15161A]">
                  {v}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
