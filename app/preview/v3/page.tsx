import Link from "next/link";
import { ArrowRight, PhoneIncoming, Cpu, PhoneOutgoing, Receipt } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";

const INK = "#15161A";
const BLUE = "#3B5A78";
const MUTE = "#6B7070";
const BORDER = "#E5E7EB";

export default function V3Landing() {
  return (
    <main className="min-h-dvh bg-white" style={{ color: INK }}>
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
          <Link href="/preview/v3">
            <HandleLogo variant="wordmark-on-light" width={90} height={22} priority />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {["Product", "How it works", "Pricing", "Docs"].map((l) => (
              <span key={l} className="rounded-md px-3 py-1.5 font-medium" style={{ color: MUTE }}>
                {l}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/preview" className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ color: MUTE }}>
              ← Variants
            </Link>
            <Link
              href="/preview/v3/dashboard"
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: BLUE }}
            >
              Dashboard <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "#C7D9E8", background: "#EEF4F9", color: BLUE }}
          >
            <span className="size-1.5 rounded-full motion-safe:animate-pulse" style={{ background: BLUE }} />
            Live · YC Call My Agent Hackathon
          </div>
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.06] tracking-tight md:text-7xl">
            Property maintenance, on autopilot.
          </h1>
          <p className="mt-7 max-w-2xl text-balance text-lg leading-relaxed" style={{ color: MUTE }}>
            Your tenants call one number. Handle triages, dials contractors in
            parallel, books the job, and pays them out — all before you&apos;ve
            checked Slack.
          </p>
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/preview/v3/dashboard"
              className="inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-semibold text-white"
              style={{ background: BLUE }}
            >
              Open dashboard <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex h-11 items-center rounded-md border px-6 text-sm font-medium"
              style={{ borderColor: BORDER, color: INK }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="border-b bg-gray-50" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-24">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BLUE }}>
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Four steps. Zero forms.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Tenant calls", body: "One number per property. Voice answers in under 2 seconds.", Icon: PhoneIncoming },
              { n: "02", title: "Agent triages", body: "Gemini classifies the issue, sets urgency, writes the work order.", Icon: Cpu },
              { n: "03", title: "Contractors dialed", body: "Top three called in parallel. First to accept gets the job.", Icon: PhoneOutgoing },
              { n: "04", title: "Invoiced & paid", body: "Invoice sent, owner notified, survey closes the loop.", Icon: Receipt },
            ].map(({ n, title, body, Icon }) => (
              <div key={n} className="flex flex-col rounded-xl border bg-white p-6" style={{ borderColor: BORDER }}>
                <div className="mb-5 flex items-center justify-between">
                  <span
                    className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: BLUE }}
                  >
                    {n}
                  </span>
                  <Icon className="size-4" style={{ color: MUTE }} />
                </div>
                <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTE }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-white" style={{ borderColor: BORDER }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
          <HandleLogo variant="wordmark-on-light" width={80} height={20} />
          <span className="text-xs" style={{ color: MUTE }}>v3 · White · Dense</span>
        </div>
      </footer>
    </main>
  );
}
