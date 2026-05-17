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
    <section id="how-it-works" className="w-full border-b border-[#E8E3DA] bg-[#EEEBE4] py-24 md:py-28">
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-14">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
            How it works
          </span>
          <h2 className="mt-3 max-w-2xl text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
            Four steps. Zero forms.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, body, Icon }) => (
            <div
              key={n}
              className="flex flex-col rounded-2xl border border-[#E8E3DA] bg-white p-6"
              style={{ boxShadow: "0 2px 12px rgba(21,22,26,0.07)" }}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#15161A] text-xs font-black text-[#F6F4EF]">
                  {n}
                </span>
                <Icon className="size-4 text-[#9AA0A0]" />
              </div>
              <h3 className="text-base font-bold tracking-tight text-[#15161A]">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-[#6B7070]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
