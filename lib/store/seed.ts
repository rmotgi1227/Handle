import { store } from "./memory";

/**
 * Seed demo data so the dashboard has something to render on cold start.
 * Called from `app/layout.tsx` (server) so it runs once per process.
 */
let seeded = false;
export function seedOnce(): void {
  if (seeded) return;
  seeded = true;

  // People
  store.upsertPerson({
    id: "person_pm_1",
    role: "property_manager",
    name: "Alex Rivera",
    phone: "+14155551200",
    email: "alex@rivera-pm.com",
  });
  store.upsertPerson({
    id: "person_owner_1",
    role: "homeowner",
    name: "Priya Kapoor",
    phone: "+14155551301",
    email: "priya@example.com",
  });
  store.upsertPerson({
    id: "person_tenant_1",
    role: "tenant",
    name: "Marcus Chen",
    phone: "+14155551410",
    propertyId: "prop_1",
    unitId: "unit_p1_3b",
  });
  store.upsertPerson({
    id: "person_tenant_2",
    role: "tenant",
    name: "Jamie Patel",
    phone: "+14155551411",
    propertyId: "prop_2",
    unitId: "unit_p2_ph",
  });
  store.upsertPerson({
    id: "person_tenant_3",
    role: "tenant",
    name: "Dani Okafor",
    phone: "+14155551420",
    propertyId: "prop_1",
    unitId: "unit_p1_2a",
  });
  store.upsertPerson({
    id: "person_tenant_4",
    role: "tenant",
    name: "Sasha Lin",
    phone: "+14155551421",
    propertyId: "prop_1",
    unitId: "unit_p1_1a",
  });
  store.upsertPerson({
    id: "person_tenant_5",
    role: "tenant",
    name: "Wes Holloway",
    phone: "+14155551422",
    propertyId: "prop_1",
    unitId: "unit_p1_4a",
  });
  store.upsertPerson({
    id: "person_tenant_6",
    role: "tenant",
    name: "Noor Rahimi",
    phone: "+14155551430",
    propertyId: "prop_2",
    unitId: "unit_p2_2",
  });
  store.upsertPerson({
    id: "person_tenant_7",
    role: "tenant",
    name: "Theo Park",
    phone: "+14155551431",
    propertyId: "prop_2",
    unitId: "unit_p2_3",
  });

  // Buildings (Property) — building-wide info the agent reads back during triage.
  store.upsertProperty({
    id: "prop_1",
    address: "342 Valencia St",
    unit: "3B", // legacy "primary unit" — single-line displays still use this
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: [
      "person_tenant_1",
      "person_tenant_3",
      "person_tenant_4",
      "person_tenant_5",
    ],
    propertyType: "apartment_building",
    yearBuilt: 1924,
    gateCode: "4421#",
    lockboxCode: "0316",
    parkingNotes: "Street parking only — no driveway. Loading zone on 19th OK for ≤30 min.",
    accessNotes: "Main entry on Valencia. Buzzer code list mounted left of door. Service entrance on Rondel Pl.",
    waterShutoffLocation: "Basement mechanical room — main shutoff is the large red-handled valve.",
    electricalPanelLocation: "Basement, breaker room. Sub-panels in each unit's hall closet.",
    hvacType: "Radiator heat (landlord-controlled boiler). Window AC units owned by tenants.",
    ownerInstructions:
      "Owner prefers Bay Area Plumbing Co. for any plumbing work — they know the building's old galvanized lines. Any spend over the cap needs Priya's text approval.",
    spendCapCents: 50000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes: "Built 1924 — galvanized water lines, expect recurring drain-trap issues. Roof was redone 2022 (Bay Roofers warranty active).",
  });
  store.upsertProperty({
    id: "prop_2",
    address: "1180 Folsom St",
    unit: "PH",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: ["person_tenant_2", "person_tenant_6", "person_tenant_7"],
    propertyType: "condo_building",
    yearBuilt: 2008,
    gateCode: "5566",
    lockboxCode: "9921",
    parkingNotes: "Loading zone on Folsom good for ≤30 min. Contractor parking validates at front desk.",
    accessNotes: "Concierge 8a–8p. Outside those hours use the service-elevator lockbox; tell contractors to ring 'Service' on the call box.",
    waterShutoffLocation: "Per-unit shutoffs in mechanical closet inside each unit (off the kitchen).",
    electricalPanelLocation: "Per-unit panel in laundry. Building main in basement (concierge has key).",
    hvacType: "Central forced-air w/ Nest in each unit. Building chiller — HVAC vendor must coordinate w/ HOA on rooftop work.",
    ownerInstructions: "HOA requires COI on file BEFORE any contractor arrives. Owner prefers Mission Electric for electrical.",
    spendCapCents: 100000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes: "HOA fines $250 for any work before 9a or after 6p (incl. Saturdays). No work Sundays.",
  });

  // Units inside each building.
  store.upsertUnit({
    id: "unit_p1_1a",
    propertyId: "prop_1",
    label: "1A",
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 650,
    lockboxCode: "1010",
    tenantIds: ["person_tenant_4"],
    notes: "Garden-level — recurring moisture issues near baseboards along Rondel side.",
  });
  store.upsertUnit({
    id: "unit_p1_2a",
    propertyId: "prop_1",
    label: "2A",
    floor: 2,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 880,
    lockboxCode: "2020",
    tenantIds: ["person_tenant_3"],
    notes: "Hardwood floors refinished 2024.",
  });
  store.upsertUnit({
    id: "unit_p1_2b",
    propertyId: "prop_1",
    label: "2B",
    floor: 2,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 880,
    tenantIds: [],
    vacant: true,
    notes: "Turning over — kitchen reno scheduled June.",
  });
  store.upsertUnit({
    id: "unit_p1_3a",
    propertyId: "prop_1",
    label: "3A",
    floor: 3,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 720,
    lockboxCode: "3030",
    tenantIds: [],
    vacant: true,
    notes: "On the market — showings via owner only.",
  });
  store.upsertUnit({
    id: "unit_p1_3b",
    propertyId: "prop_1",
    label: "3B",
    floor: 3,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 920,
    lockboxCode: "0316",
    tenantIds: ["person_tenant_1"],
    notes: "Friendly Maine Coon — let contractors know. Drain-trap leak under kitchen sink (3x in 18 months).",
  });
  store.upsertUnit({
    id: "unit_p1_4a",
    propertyId: "prop_1",
    label: "4A (top)",
    floor: 4,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1020,
    lockboxCode: "4040",
    tenantIds: ["person_tenant_5"],
    notes: "Top-floor unit — skylight in primary bath. Roof access via hall hatch (key with concierge equiv).",
  });

  store.upsertUnit({
    id: "unit_p2_1",
    propertyId: "prop_2",
    label: "101",
    floor: 1,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    tenantIds: [],
    vacant: true,
    notes: "Lobby-level — high foot-traffic noise complaints.",
  });
  store.upsertUnit({
    id: "unit_p2_2",
    propertyId: "prop_2",
    label: "204",
    floor: 2,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1280,
    lockboxCode: "2204",
    tenantIds: ["person_tenant_6"],
    notes: "Per-unit Nest replaced 2025-02.",
  });
  store.upsertUnit({
    id: "unit_p2_3",
    propertyId: "prop_2",
    label: "312",
    floor: 3,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1480,
    lockboxCode: "3312",
    tenantIds: ["person_tenant_7"],
    notes: "Bosch dishwasher under extended warranty until 2027.",
    spendCapCents: 75000,
  });
  store.upsertUnit({
    id: "unit_p2_ph",
    propertyId: "prop_2",
    label: "PH (Penthouse)",
    floor: 4,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1620,
    lockboxCode: "9921",
    tenantIds: ["person_tenant_2"],
    spendCapCents: 150000,
    notes: "Rooftop deck access via spiral stairs in primary suite. Hot-tub serviced quarterly by SF Spa.",
  });

  // Contractor pool
  const contractors = [
    { id: "ctr_1", name: "Bay Area Plumbing Co.", phone: "+14155552001", trades: ["plumbing"], rating: 4.8, city: "San Francisco", walletAddress: "AzSqf7aAND7iwjFyPqakki7XQ5ogMwSxqhp3cmGCvvcU" },
    { id: "ctr_2", name: "Mission Electric", phone: "+14155552002", trades: ["electrical"], rating: 4.6, city: "San Francisco" },
    { id: "ctr_3", name: "FastFix HVAC", phone: "+14155552003", trades: ["hvac"], rating: 4.4, city: "San Francisco" },
    { id: "ctr_4", name: "GoldenGate Locksmith", phone: "+14155552004", trades: ["locksmith"], rating: 4.9, city: "San Francisco", walletAddress: "AzSqf7aAND7iwjFyPqakki7XQ5ogMwSxqhp3cmGCvvcU" },
    { id: "ctr_5", name: "All-Around Handy", phone: "+14155552005", trades: ["general", "appliance"], rating: 4.5, city: "Oakland" },
  ] as const;
  for (const c of contractors) {
    store.upsertContractor({ ...c, trades: [...c.trades], source: "directory" });
  }

  // One in-flight job, one completed, one new
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  store.upsertJob({
    id: "job_seed_active",
    propertyId: "prop_1",
    reportedByPersonId: "person_tenant_1",
    status: "sourcing_contractor",
    urgency: "urgent",
    trade: "plumbing",
    title: "Kitchen sink leaking under cabinet",
    description: "Tenant reports water pooling under the sink. Visible drip from the drain trap.",
    callIds: ["call_seed_1"],
  });

  store.upsertCall({
    id: "call_seed_1",
    fromNumber: "+14155551410",
    callerId: "person_tenant_1",
    callerRole: "tenant",
    propertyId: "prop_1",
    status: "completed",
    startedAt: iso(12),
    endedAt: iso(8),
    durationSec: 240,
    transcript: [
      { at: iso(12), speaker: "agent", text: "Hi, you've reached the property line for 342 Valencia. What's going on?" },
      { at: iso(11), speaker: "caller", text: "There's water under my kitchen sink and it's getting worse." },
      { at: iso(11), speaker: "agent", text: "Got it — sounds urgent. Can you show me where it's coming from? I'll dispatch a plumber now." },
    ],
    summary: "Kitchen sink leak, drain trap. Tenant in unit 3B at 342 Valencia.",
    intent: "maintenance.plumbing.leak",
    jobId: "job_seed_active",
  });

  store.appendEvent({ jobId: "job_seed_active", kind: "call_received", title: "Tenant call received", detail: "Marcus Chen — leak under kitchen sink", at: iso(12) });
  store.appendEvent({ jobId: "job_seed_active", kind: "intent_classified", title: "Classified as plumbing · urgent", at: iso(11) });
  store.appendEvent({ jobId: "job_seed_active", kind: "diagnosed", title: "Diagnosed: drain trap leak", detail: "Best guess based on tenant description; plumber will confirm.", at: iso(10) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_search_started", title: "Searching for plumbers within 5 miles", at: iso(9) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_search_completed", title: "Found 3 candidates", data: { contractorIds: ["ctr_1"] }, at: iso(8) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_dial_started", title: "Dialing Bay Area Plumbing Co.", at: iso(7) });

  store.upsertJob({
    id: "job_seed_done",
    propertyId: "prop_2",
    reportedByPersonId: "person_tenant_2",
    status: "completed",
    urgency: "standard",
    trade: "locksmith",
    title: "Lockout — front door deadbolt",
    description: "Tenant locked out, needs entry.",
    assignedContractorId: "ctr_4",
    totalCostCents: 18500,
    callIds: [],
    satisfactionScore: 5,
    satisfactionFeedback: "Locksmith was at the door in 22 minutes. Painless.",
  });

  store.appendEvent({ jobId: "job_seed_done", kind: "call_received", title: "Tenant call received", at: iso(360) });
  store.appendEvent({ jobId: "job_seed_done", kind: "contractor_assigned", title: "Assigned GoldenGate Locksmith", at: iso(345) });
  store.appendEvent({ jobId: "job_seed_done", kind: "work_completed", title: "Work completed", at: iso(300) });
  store.appendEvent({ jobId: "job_seed_done", kind: "paid", title: "Paid via Sponge — $185.00", at: iso(290) });
  store.appendEvent({ jobId: "job_seed_done", kind: "survey_completed", title: "Survey: 5/5", detail: "Locksmith was at the door in 22 minutes. Painless.", at: iso(280) });

  // Historical paid jobs so the Payments page has a populated payout history.
  // Spread across days, contractors, and trades for a realistic ledger.
  const history: Array<{
    id: string;
    propertyId: string;
    reportedByPersonId: string;
    urgency: import("../types/job").JobUrgency;
    trade: import("../types/contractor").Trade;
    title: string;
    description: string;
    contractorId: string;
    amountCents: number;
    daysAgo: number;
    txnHash?: string;
    satisfactionScore?: number;
    satisfactionFeedback?: string;
  }> = [
    {
      id: "job_hist_1",
      propertyId: "prop_2",
      reportedByPersonId: "person_tenant_2",
      urgency: "urgent",
      trade: "appliance",
      title: "Dishwasher leak — Bosch under warranty",
      description: "Tenant reported water on the kitchen floor from the dishwasher kickplate.",
      contractorId: "ctr_5",
      amountCents: 14500,
      daysAgo: 1,
      txnHash: "4kZQ8t2Vm9pXn3rJqAyW1pZcN8gM5sLfH7uYxB6dC2eR",
      satisfactionScore: 5,
      satisfactionFeedback: "Same day fix. Tech was great.",
    },
    {
      id: "job_hist_2",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_3",
      urgency: "standard",
      trade: "plumbing",
      title: "Bathroom sink slow drain",
      description: "Snake + p-trap clean. Recurring; suggested follow-up if it returns.",
      contractorId: "ctr_1",
      amountCents: 22000,
      daysAgo: 2,
      txnHash: "7sR4nXf3Wp1mQ9hLkE5dCtV2yA6gBxJ8uZoP3iN5rT9q",
    },
    {
      id: "job_hist_3",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_4",
      urgency: "urgent",
      trade: "electrical",
      title: "Tripping breaker — kitchen outlets",
      description: "Replaced load-side GFCI; old outlet was arcing.",
      contractorId: "ctr_2",
      amountCents: 31500,
      daysAgo: 3,
      txnHash: "9pTm6FvX4cZ2nQ8aLkH3eRwBjY7uCgD5sAxoP1iN6qE2",
      satisfactionScore: 4,
    },
    {
      id: "job_hist_4",
      propertyId: "prop_2",
      reportedByPersonId: "person_tenant_6",
      urgency: "standard",
      trade: "hvac",
      title: "Nest not heating — calls but no fan",
      description: "Replaced 24V transformer; thermostat now controlling air handler.",
      contractorId: "ctr_3",
      amountCents: 28000,
      daysAgo: 5,
      txnHash: "3aRf9XpV2mZ7nQ4hLkB6eYwCjT5uDgN8sExoP1iH4qK2",
    },
    {
      id: "job_hist_5",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_5",
      urgency: "standard",
      trade: "general",
      title: "Garbage disposal replacement",
      description: "Old Insinkerator humming, not spinning. Swapped for 3/4 HP unit.",
      contractorId: "ctr_5",
      amountCents: 19500,
      daysAgo: 6,
      satisfactionScore: 5,
      satisfactionFeedback: "Quick swap, cleaned up after.",
    },
    {
      id: "job_hist_6",
      propertyId: "prop_2",
      reportedByPersonId: "person_tenant_7",
      urgency: "urgent",
      trade: "plumbing",
      title: "Toilet flange leak at second floor",
      description: "Wax ring failed; rebuilt flange and reset toilet. No subfloor damage.",
      contractorId: "ctr_1",
      amountCents: 48500,
      daysAgo: 8,
      txnHash: "2nTk8GvY3cW5pX9rJqH6dEzBfA1uCmL4sNxoP7iR2qV5",
    },
    {
      id: "job_hist_7",
      propertyId: "prop_1",
      reportedByPersonId: "person_tenant_1",
      urgency: "scheduled",
      trade: "locksmith",
      title: "Rekey unit after turnover",
      description: "Front + back deadbolts rekeyed, three keys to PM.",
      contractorId: "ctr_4",
      amountCents: 9500,
      daysAgo: 10,
      satisfactionScore: 5,
    },
  ];

  const contractorName = (id: string): string =>
    contractors.find((c) => c.id === id)?.name ?? "Contractor";
  const dollars = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

  for (const h of history) {
    const closedAt = h.daysAgo * 1440; // minutes ago for the paid moment
    store.upsertJob({
      id: h.id,
      propertyId: h.propertyId,
      reportedByPersonId: h.reportedByPersonId,
      status: "paid",
      urgency: h.urgency,
      trade: h.trade,
      title: h.title,
      description: h.description,
      assignedContractorId: h.contractorId,
      totalCostCents: h.amountCents,
      callIds: [],
      paymentTxnHash: h.txnHash,
      satisfactionScore: h.satisfactionScore,
      satisfactionFeedback: h.satisfactionFeedback,
    });
    store.appendEvent({ jobId: h.id, kind: "call_received", title: "Tenant call received", at: iso(closedAt + 90) });
    store.appendEvent({ jobId: h.id, kind: "contractor_assigned", title: `Assigned ${contractorName(h.contractorId)}`, at: iso(closedAt + 75) });
    store.appendEvent({ jobId: h.id, kind: "work_completed", title: "Work completed", at: iso(closedAt + 15) });
    store.appendEvent({ jobId: h.id, kind: "paid", title: `Paid via Sponge — ${dollars(h.amountCents)}`, at: iso(closedAt) });
    if (h.satisfactionScore) {
      store.appendEvent({
        jobId: h.id,
        kind: "survey_completed",
        title: `Survey: ${h.satisfactionScore}/5`,
        detail: h.satisfactionFeedback,
        at: iso(closedAt - 30),
      });
    }
  }
}
