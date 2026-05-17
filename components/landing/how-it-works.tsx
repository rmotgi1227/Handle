import { PhoneIncoming, Cpu, PhoneOutgoing, Receipt } from "lucide-react";

type Step = {
  n: string;
  title: string;
  body: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Tenant calls",
    body: "One number for every property. Voice agent answers in under two seconds and pulls up unit history instantly.",
    Icon: PhoneIncoming,
  },
  {
    n: "02",
    title: "Agent triages",
    body: "Gemini classifies the issue, sets urgency, and writes the work order — no forms, no PM in the loop.",
    Icon: Cpu,
  },
  {
    n: "03",
    title: "Contractors dialed in parallel",
    body: "Top three local contractors are called simultaneously. First to accept gets the job and a confirmed ETA.",
    Icon: PhoneOutgoing,
  },
  {
    n: "04",
    title: "Invoiced & paid",
    body: "Sponge generates the invoice, AgentMail notifies the owner, and the survey closes the loop automatically.",
    Icon: Receipt,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="w-full border-b border-zinc-200 bg-zinc-50 py-24 md:py-32 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 flex flex-col items-start gap-3 md:mb-16">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
            How it works
          </span>
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-black md:text-4xl dark:text-white">
            Four steps. Zero forms. The PM only steps in for exceptions.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, body, Icon }) => (
            <div
              key={n}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-black text-[11px] font-semibold tracking-wide text-white dark:bg-white dark:text-black">
                  {n}
                </span>
                <Icon className="size-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-black dark:text-white">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
