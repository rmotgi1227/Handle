import Link from "next/link";
import { ArrowRight, PhoneIncoming, Cpu, PhoneOutgoing, Receipt } from "lucide-react";
import { HandleLogo } from "@/components/preview/handle-logo";

const CREAM = "#F6F4EF";
const INK = "#15161A";
const BLUE = "#3B5A78";
const MUTE = "#6B7070";
const BORDER = "#E8E3DA";
const WHITE = "#FFFFFF";
const ORANGE = "#E8572A";

export default function V1Landing() {
  return (
    <main className="min-h-dvh" style={{ background: CREAM, color: INK }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-10 border-b"
        style={{ borderColor: BORDER, background: `${CREAM}e8`, backdropFilter: "blur(10px)" }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <Link href="/preview/v1">
            <HandleLogo variant="wordmark-on-light" width={100} height={26} priority />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/preview" className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ color: MUTE }}>
              ← Variants
            </Link>
            <Link
              href="/preview/v1/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold"
              style={{ background: INK, color: CREAM }}
            >
              Open dashboard <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b"
        style={{ borderColor: BORDER }}
      >
        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, ${BORDER} 1px, transparent 1px), linear-gradient(to bottom, ${BORDER} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
            opacity: 0.7,
          }}
        />

        <div className="relative mx-auto max-w-6xl px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          {/* YC badge strip — matches reference style */}
          <div className="mb-10">
            <div
              className="inline-flex items-center gap-3 border px-3 py-2"
              style={{ borderColor: ORANGE }}
            >
              {/* YC box */}
              <span
                className="inline-flex size-7 shrink-0 items-center justify-center text-xs font-black"
                style={{ background: ORANGE, color: WHITE }}
              >
                Y
              </span>
              <span
                className="text-xs font-bold uppercase tracking-[0.18em]"
                style={{ color: ORANGE }}
              >
                Built at YC · Call My Agent Hackathon
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="max-w-3xl text-balance text-6xl font-black leading-[1.02] tracking-tight md:text-7xl lg:text-8xl">
            Property maintenance, on autopilot.
          </h1>

          {/* Subline in reference style — all-caps tracking */}
          <div
            className="mt-6 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.22em]"
            style={{ color: MUTE }}
          >
            <span>AI Dispatch</span>
            <span style={{ color: BORDER }}>·</span>
            <span>Parallel Outreach</span>
            <span style={{ color: BORDER }}>·</span>
            <span>Automated Payments</span>
          </div>

          <p className="mt-8 max-w-2xl text-balance text-lg font-medium leading-relaxed" style={{ color: MUTE }}>
            Your tenants call one number. Handle triages, dials contractors in
            parallel, books the job, and pays them out — all before you&apos;ve
            checked Slack.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/preview/v1/dashboard"
              className="inline-flex h-13 items-center gap-2 rounded-full px-8 text-base font-bold"
              style={{ background: INK, color: CREAM }}
            >
              Open dashboard <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex h-13 items-center rounded-full border px-8 text-base font-semibold"
              style={{ borderColor: BORDER, color: INK, background: WHITE }}
            >
              How it works
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b" style={{ borderColor: BORDER }}>
        <div className="mx-auto max-w-6xl px-8 py-24 md:py-28">
          <div className="mb-14">
            <p
              className="text-xs font-bold uppercase tracking-[0.22em]"
              style={{ color: BLUE }}
            >
              How it works
            </p>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-black tracking-tight md:text-5xl">
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
                style={{
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 2px 12px rgba(21,22,26,0.07)",
                }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-full text-xs font-black"
                    style={{ background: INK, color: CREAM }}
                  >
                    {n}
                  </span>
                  <Icon className="size-4" style={{ color: MUTE }} />
                </div>
                <h3 className="text-base font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed" style={{ color: MUTE }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ background: CREAM, borderTop: `1px solid ${BORDER}` }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-10">
          <HandleLogo variant="wordmark-on-light" width={80} height={20} />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: MUTE }}>
            v1 · Light · Airy
          </span>
        </div>
      </footer>
    </main>
  );
}
