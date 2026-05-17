import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8E3DA] bg-[#F6F4EF]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, #E8E3DA 1px, transparent 1px), linear-gradient(to bottom, #E8E3DA 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.6,
        }}
      />
      <div className="relative mx-auto max-w-6xl px-8 pt-20 pb-24 md:pt-28 md:pb-32">
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
          Your tenants call one number. Handle triages, dials contractors in
          parallel, books the job, and pays them out — all before you&apos;ve
          checked Slack.
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
            How it works
          </Link>
        </div>
      </div>
    </section>
  );
}
