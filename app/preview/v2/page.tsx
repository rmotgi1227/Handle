import Link from "next/link";
import { ArrowRight, PhoneIncoming, Cpu, PhoneOutgoing, Receipt } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";

const BG = "#15161A";
const PANEL = "#1E2028";
const LINE = "#2A2C32";
const CREAM = "#F6F4EF";
const BLUE = "#3B5A78";
const BLUE_BRIGHT = "#5B82A8";
const MUTE = "#8A9090";

export default function V2Landing() {
  return (
    <main className="min-h-dvh" style={{ background: BG, color: CREAM }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{ borderColor: LINE, background: `${BG}e8`, backdropFilter: "blur(10px)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <Link href="/preview/v2">
            <HandleLogo variant="wordmark-on-dark" width={100} height={26} priority />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/preview" className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ color: MUTE }}>
              ← Variants
            </Link>
            <Link
              href="/preview/v2/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: CREAM, color: BG }}
            >
              Dashboard <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b" style={{ borderColor: LINE }}>
        <div className="mx-auto max-w-6xl px-8 pt-24 pb-20 md:pt-32 md:pb-28">
          <div
            className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: BLUE, background: "rgba(59,90,120,0.15)", color: BLUE_BRIGHT }}
          >
            <span className="size-1.5 rounded-full motion-safe:animate-pulse" style={{ background: BLUE_BRIGHT }} />
            YC Call My Agent Hackathon · Live
          </div>
          <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.06] tracking-tight md:text-7xl">
            Property maintenance, on autopilot.
          </h1>
          <p className="mt-7 max-w-2xl text-balance text-lg leading-relaxed" style={{ color: MUTE }}>
            Your tenants call one number. Handle triages, dials contractors in
            parallel, books the job, and pays them out — all before you&apos;ve
            checked Slack.
          </p>
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/preview/v2/dashboard"
              className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold"
              style={{ background: CREAM, color: BG }}
            >
              Open dashboard <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex h-12 items-center rounded-full border px-7 text-base font-medium"
              style={{ borderColor: LINE, color: CREAM }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      <section id="how" className="border-b" style={{ borderColor: LINE }}>
        <div className="mx-auto max-w-6xl px-8 py-24 md:py-28">
          <div className="mb-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: BLUE_BRIGHT }}>
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Four steps. Zero forms.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", title: "Tenant calls", body: "One number per property. Voice answers in under 2 seconds.", Icon: PhoneIncoming },
              { n: "02", title: "Agent triages", body: "Gemini classifies the issue, sets urgency, writes the work order.", Icon: Cpu },
              { n: "03", title: "Contractors dialed", body: "Top three called in parallel. First to accept gets the job.", Icon: PhoneOutgoing },
              { n: "04", title: "Invoiced & paid", body: "Invoice sent, owner notified, survey closes the loop.", Icon: Receipt },
            ].map(({ n, title, body, Icon }) => (
              <div
                key={n}
                className="flex flex-col rounded-2xl p-6"
                style={{ background: PANEL, border: `1px solid ${LINE}` }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ background: BLUE, color: CREAM }}
                  >
                    {n}
                  </span>
                  <Icon className="size-4" style={{ color: MUTE }} />
                </div>
                <h3 className="text-base font-semibold tracking-tight" style={{ color: CREAM }}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTE }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: BG, borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-10">
          <HandleLogo variant="wordmark-on-dark" width={80} height={20} />
          <span className="text-xs" style={{ color: MUTE }}>v2 · Dark · Calm</span>
        </div>
      </footer>
    </main>
  );
}
