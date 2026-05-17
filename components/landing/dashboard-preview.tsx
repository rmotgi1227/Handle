import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const HIGHLIGHTS: Array<{ k: string; v: string }> = [
  { k: "Live calls", v: "Streaming transcripts as they happen" },
  { k: "Triaged jobs", v: "Urgency, trade, and recall context per call" },
  { k: "Contractor race", v: "Watch three dial-outs in parallel" },
  { k: "Payments", v: "Sponge invoice + payout, one click" },
];

export function DashboardPreview() {
  return (
    <section
      id="preview"
      className="relative w-full border-b border-[#E8E3DA] bg-[#EEEBE4] py-24 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
              Inside the dashboard
            </span>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
              Calm operations console.
            </h2>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-[#6B7070]">
              One pane for every property. Watch calls come in, see what
              the agent decided, and only step in when you actually want to.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-[#15161A] px-5 text-sm font-bold uppercase tracking-[0.16em] text-[#F6F4EF] transition-colors hover:bg-[#2A2C30] md:self-end"
          >
            Open dashboard <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <div className="relative overflow-hidden rounded-3xl border border-[#E8E3DA] bg-white shadow-[0_8px_40px_rgba(21,22,26,0.10)]">
            <div className="flex items-center justify-between border-b border-[#E8E3DA] bg-[#F6F4EF] px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[#E8572A]" />
                <span className="size-2.5 rounded-full bg-[#E8E3DA]" />
                <span className="size-2.5 rounded-full bg-[#E8E3DA]" />
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#9AA0A0]">
                handle.app/dashboard
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
                <Sparkles className="size-3" /> live mode
              </span>
            </div>
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/dashboard-preview.png"
                alt="Handle dashboard preview"
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover object-top"
                priority={false}
              />
            </div>
          </div>

          <ul className="grid content-start gap-3">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h.k}
                className="rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-shadow hover:shadow-[0_2px_16px_rgba(21,22,26,0.06)]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
                  {h.k}
                </p>
                <p className="mt-1 text-base font-bold leading-snug text-[#15161A]">
                  {h.v}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
