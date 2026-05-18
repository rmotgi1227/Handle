import {
  PhoneCall,
  Brain,
  Database,
  Layers,
  Globe,
  Coins,
  Mail,
  CreditCard,
} from "lucide-react";

type Vendor = {
  name: string;
  role: string;
  body: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: "ink" | "orange" | "blue";
};

const VENDORS: Vendor[] = [
  {
    name: "AgentPhone",
    role: "Voice runtime",
    body: "Handles inbound triage and parallel contractor dial-outs. Sub-second connection, transcript streaming.",
    Icon: PhoneCall,
    accent: "ink",
  },
  {
    name: "Gemini 2.5",
    role: "Reasoning + vision",
    body: "Classifies intent, drafts the work order, negotiates ETA with contractors. If the tenant can't describe the issue, Gemini analyses a short video they send and diagnoses the damage.",
    Icon: Brain,
    accent: "orange",
  },
  {
    name: "Moss",
    role: "Catalog recall",
    body: "Sub-10ms semantic search over the vetted contractor catalog and property knowledge index.",
    Icon: Layers,
    accent: "blue",
  },
  {
    name: "Supermemory",
    role: "Long-term memory",
    body: "Cross-session history: past jobs per unit, owner preferences, tenant satisfaction outcomes.",
    Icon: Database,
    accent: "ink",
  },
  {
    name: "Browser Use",
    role: "Live discovery",
    body: "Pulls nearby contractor info live from business listings when the catalog is light on a trade — the result is written back to Moss for next time.",
    Icon: Globe,
    accent: "orange",
  },
  {
    name: "Sponge",
    role: "Contractor payouts",
    body: "Settles the contractor's Stripe invoice from the landlord's operating wallet — USDC on Solana, on-chain in seconds. Marks the Stripe invoice paid out-of-band so books stay aligned.",
    Icon: Coins,
    accent: "blue",
  },
  {
    name: "AgentMail",
    role: "Owner comms + email fallback",
    body: "Notifies the owner with the work order, the chosen contractor, and the receipt. Also the fallback rail when no one answers the phone: emails the next-best contractor the same brief.",
    Icon: Mail,
    accent: "ink",
  },
  {
    name: "Stripe",
    role: "Contractor invoicing",
    body: "Generates the contractor's invoice on job completion — line items, amount, hosted page. Sponge settles it via USDC; Stripe is the source of truth for what's owed.",
    Icon: CreditCard,
    accent: "orange",
  },
];

const ACCENT: Record<Vendor["accent"], { chip: string; label: string; dot: string }> = {
  ink: { chip: "bg-[#15161A] text-[#F6F4EF]", label: "text-[#15161A]", dot: "bg-[#15161A]" },
  orange: { chip: "bg-[#E8572A] text-[#F6F4EF]", label: "text-[#C24919]", dot: "bg-[#E8572A]" },
  blue: { chip: "bg-[#3B5A78] text-[#F6F4EF]", label: "text-[#3B5A78]", dot: "bg-[#3B5A78]" },
};

export function TechStack() {
  return (
    <section
      id="stack"
      className="w-full border-b border-[#E8E3DA] bg-[#F6F4EF] py-24 md:py-28"
    >
      <div className="mx-auto max-w-6xl px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#3B5A78]">
              The stack
            </span>
            <h2 className="mt-3 max-w-2xl text-balance text-4xl font-black tracking-tight text-[#15161A] md:text-5xl">
              Eight tools, one calm dispatcher.
            </h2>
          </div>
          <p className="max-w-md text-base font-medium leading-relaxed text-[#6B7070]">
            Every integration earns its spot. No glue layers, no chatbots
            pretending to be useful — just the right tool wired to the right
            step.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {VENDORS.map((v) => {
            const a = ACCENT[v.accent];
            return (
              <article
                key={v.name}
                className="group relative flex flex-col rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-shadow hover:shadow-[0_4px_24px_rgba(21,22,26,0.08)]"
              >
                <span
                  className={`mb-5 inline-flex size-10 items-center justify-center rounded-xl ${a.chip}`}
                >
                  <v.Icon className="size-[18px]" />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-1.5 rounded-full ${a.dot}`} aria-hidden />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${a.label}`}
                  >
                    {v.role}
                  </span>
                </span>
                <h3 className="mt-1.5 text-lg font-black tracking-tight text-[#15161A]">
                  {v.name}
                </h3>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#6B7070]">
                  {v.body}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
