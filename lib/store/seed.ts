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
  });
  store.upsertPerson({
    id: "person_tenant_2",
    role: "tenant",
    name: "Jamie Patel",
    phone: "+14155551411",
    propertyId: "prop_2",
  });

  // Properties
  store.upsertProperty({
    id: "prop_1",
    address: "342 Valencia St",
    unit: "3B",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: ["person_tenant_1"],
  });
  store.upsertProperty({
    id: "prop_2",
    address: "1180 Folsom St",
    unit: "PH",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: ["person_tenant_2"],
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
}
