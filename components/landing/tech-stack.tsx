import {
  PhoneCall,
  Brain,
  Database,
  Layers,
  Globe,
  Receipt,
  Mail,
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
    role: "Reasoning",
    body: "Classifies intent, drafts the work order, negotiates ETA with contractors, summarizes resolutions.",
    Icon: Brain,
    accent: "orange",
  },
  {
    name: "Moss",
    role: "Catalog recall",
    body: "Sub-10ms semantic search over the vetted contractor catalog and the property knowledge index.",
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
    body: "When the catalog misses, an agent crawls live business listings for vetted local pros.",
    Icon: Globe,
    accent: "orange",
  },
  {
    name: "Sponge",
    role: "Invoicing & payouts",
    body: "Generates invoices on job completion and releases payout to the contractor.",
    Icon: Receipt,
    accent: "blue",
  },
  {
    name: "AgentMail",
    role: "Owner comms",
    body: "Notifies the owner with the work order, the chosen contractor, and the final receipt.",
    Icon: Mail,
    accent: "ink",
  },
];

const ACCENT: Record<Vendor["accent"], { ring: string; chip: string }> = {
  ink: { ring: "border-[#15161A]", chip: "bg-[#15161A] text-[#F6F4EF]" },
  orange: { ring: "border-[#E8572A]", chip: "bg-[#E8572A] text-[#F6F4EF]" },
  blue: { ring: "border-[#3B5A78]", chip: "bg-[#3B5A78] text-[#F6F4EF]" },
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
              Seven tools, one calm dispatcher.
            </h2>
          </div>
          <p className="max-w-md text-base font-medium leading-relaxed text-[#6B7070]">
            Every integration earns its spot. No glue layers, no chatbots
            pretending to be useful — just the right tool wired to the right
            step.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VENDORS.map((v, idx) => {
            const isWide = idx === 0;
            return (
              <article
                key={v.name}
                className={`group relative flex flex-col gap-4 rounded-2xl border border-[#E8E3DA] bg-white p-6 transition-shadow hover:shadow-[0_4px_24px_rgba(21,22,26,0.08)] ${
                  isWide ? "lg:col-span-2" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`inline-flex size-11 items-center justify-center rounded-xl ${ACCENT[v.accent].chip}`}
                  >
                    <v.Icon className="size-5" />
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border bg-[#F6F4EF] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#15161A] ${ACCENT[v.accent].ring}`}
                  >
                    {v.role}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-[#15161A]">
                    {v.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-[#6B7070]">
                    {v.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
