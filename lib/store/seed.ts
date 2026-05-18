import { store } from "./memory";
import type { JobUrgency } from "../types/job";
import type { Trade } from "../types/contractor";

/**
 * Seed demo data so the dashboard has something to render on cold start.
 * Called from `app/layout.tsx` (server) so it runs once per process.
 *
 * Tweak `DEMO_PAYOUT_HISTORY` below to change what the Payments page shows.
 */

// ---------------------------------------------------------------------------
// Demo config — edit these to reshape what the dashboard renders.
// ---------------------------------------------------------------------------

export interface DemoPayout {
  id: string;
  propertyId: string;
  reportedByPersonId: string;
  urgency: JobUrgency;
  trade: Trade;
  title: string;
  description: string;
  contractorId: string;
  amountCents: number;
  daysAgo: number;
  txnHash?: string;
  satisfactionScore?: number;
  satisfactionFeedback?: string;
}

export const DEMO_PAYOUT_HISTORY: DemoPayout[] = [
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
    contractorId: "ctr_1",
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

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

// Guard lives on globalThis so HMR re-evaluating this module can't reset it
// while `memory.ts` (where the store lives) holds onto the same global.
declare global {
  // eslint-disable-next-line no-var
  var __callMyAgentSeeded: boolean | undefined;
}

export function seedOnce(): void {
  if (globalThis.__callMyAgentSeeded) return;
  globalThis.__callMyAgentSeeded = true;

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
    email: "alex.battikha@gmail.com",
  });
  store.upsertPerson({
    id: "person_owner_2",
    role: "homeowner",
    name: "Marcus Beaumont",
    phone: "+14155551302",
    email: "alex.battikha@gmail.com",
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
      "Owner prefers Nick Santos for any plumbing work — they know the building's old galvanized lines. Any spend over the cap needs Priya's text approval.",
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
    ownerInstructions: "HOA requires COI on file BEFORE any contractor arrives. Owner prefers Nick Santos for electrical.",
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

  // -------------------------------------------------------------------------
  // Additional SF buildings — Hayes Valley, SoMa, Mission, Pac Heights, Sunset
  // -------------------------------------------------------------------------

  // prop_3 — 2151 Hayes St — NOPA Edwardian, 12-unit apartment building
  store.upsertProperty({
    id: "prop_3",
    address: "2151 Hayes St",
    unit: "302",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: [
      "person_tenant_8", "person_tenant_9", "person_tenant_10",
      "person_tenant_11", "person_tenant_12", "person_tenant_13",
    ],
    propertyType: "apartment_building",
    yearBuilt: 1908,
    gateCode: "2151#",
    lockboxCode: "Hayes#08",
    parkingNotes: "No on-site parking. Hayes St is permit zone H — contractors should leave a city service note in the dash.",
    accessNotes:
      "Edwardian — wide front stoop, no buzzer panel. Tenants buzz from app. Side gate on Lyon for service entry.",
    waterShutoffLocation: "Basement boiler room — north wall, brass valve labeled 'main'.",
    electricalPanelLocation: "Basement breaker room (key kept under stair-tread mat). Per-floor sub-panels in hall closets.",
    hvacType:
      "Steam radiators (original 1908 boiler, Burnham, last serviced 2024). No central AC. Tenants supply window units.",
    ownerInstructions:
      "Nick Santos knows this building cold — call them first for anything plumbing. NO drilling into south-wall plaster (asbestos sampling 2019 came back inconclusive, awaiting re-test).",
    spendCapCents: 75000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes:
      "Historic Edwardian — original crown molding throughout. Building is on the SF Preservation watch list; any exterior work needs a Planning sign-off (45-day lead time).",
  });

  // prop_4 — 789 Brannan St — SoMa modern luxury, 18-unit condo building
  store.upsertProperty({
    id: "prop_4",
    address: "789 Brannan St",
    unit: "1402",
    managerId: "person_pm_1",
    ownerId: "person_owner_2",
    tenantIds: [
      "person_tenant_14", "person_tenant_15", "person_tenant_16",
      "person_tenant_17", "person_tenant_18", "person_tenant_19",
      "person_tenant_20", "person_tenant_21",
    ],
    propertyType: "condo_building",
    yearBuilt: 2019,
    gateCode: "7890*",
    lockboxCode: "Brannan-Service",
    parkingNotes:
      "Loading dock on 7th St — 20-min limit, validate at concierge. Garage P1/P2/P3, contractors get 4hr pass at desk.",
    accessNotes:
      "24/7 concierge. Service elevator (south bank) for any contractor with tools. COI must be on file before badge issued.",
    waterShutoffLocation:
      "Per-unit shutoffs behind the laundry-stack access panel. Building main in the P1 mechanical room (concierge has key).",
    electricalPanelLocation:
      "Per-unit panel inside laundry closet. Building main switchgear in P2 (Sirius Building Services on call).",
    hvacType:
      "VRF heat pumps per unit (Daikin VRV, installed 2019). Rooftop condenser bank — HVAC vendor must coordinate w/ HOA before rooftop access.",
    ownerInstructions:
      "HOA enforces a strict 9a–5p workday rule M–F (no weekend work). All contractors must wear ID badges from concierge. Owner prefers Nick Santos for any electrical work over $500.",
    spendCapCents: 150000,
    emergencyContactName: "Marcus Beaumont (owner)",
    emergencyContactPhone: "+14155551302",
    notes:
      "Building has a $5M earthquake retrofit currently in design — expect quarterly notices about access disruptions. Bike room flood Feb 2025; sump pump replaced March.",
  });

  // prop_5 — 3445 17th St — Mission Victorian flats, 4-unit multi-family
  store.upsertProperty({
    id: "prop_5",
    address: "3445 17th St",
    unit: "Upper Front",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: ["person_tenant_22", "person_tenant_23", "person_tenant_24"],
    propertyType: "multi_family",
    yearBuilt: 1898,
    gateCode: "3445",
    lockboxCode: "Mission98",
    parkingNotes:
      "No driveway. Street parking is permit zone P — contractors should use the Mission St garage (3 blocks east) for longer jobs.",
    accessNotes:
      "Painted lady — three flights of steep wooden steps to upper units. NO HEAVY ITEMS up the front (use the back stairs via the kitchen door).",
    waterShutoffLocation:
      "Basement, south wall behind the washer. Old-style gate valve (turn clockwise, sticky after years of paint).",
    electricalPanelLocation:
      "Each unit has its own panel in the kitchen pantry. Building main is in the basement next to the water heater.",
    hvacType:
      "Gravity furnace in the basement (one of the last in SF). No AC — units rely on cross-ventilation.",
    ownerInstructions:
      "Owner wants every job documented with before/after photos (insurance requirement on the historic plaster). Tenants are long-term — give them 24hr notice before any non-emergency work.",
    spendCapCents: 60000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes:
      "True Victorian — knob-and-tube wiring in upper floors (slowly being phased out, only outlets replaced when work happens). Friendly neighbors on both sides; don't park in their driveways.",
  });

  // prop_6 — 2400 Steiner St — Pacific Heights single-family
  store.upsertProperty({
    id: "prop_6",
    address: "2400 Steiner St",
    unit: "Main",
    managerId: "person_pm_1",
    ownerId: "person_owner_2",
    tenantIds: ["person_tenant_25"],
    propertyType: "single_family",
    yearBuilt: 1920,
    gateCode: "2400",
    lockboxCode: "Steiner24",
    parkingNotes:
      "Two-car garage on the lower level (gate code 2400, opener on the right column). Street parking is residential permit only.",
    accessNotes:
      "Three-story SFR. Front entry on Steiner; service entry on the alley side (best for tools and ladders). Smart-lock — code 2400# unlocks the front door.",
    waterShutoffLocation:
      "Basement utility room, marked main. Secondary shutoff at the meter (sidewalk, west of front steps).",
    electricalPanelLocation:
      "Garage rear wall. Whole-home generator (Generac, 22kW) outside the kitchen window — service annually with Diablo Power.",
    hvacType:
      "Central forced-air w/ heat pump (Carrier, 2022). Nest thermostats on each floor.",
    ownerInstructions:
      "VIP property — owner lives in NYC and visits monthly. ANY work over $1k needs Marcus's text approval before scheduling. White-glove only: all contractors must use shoe covers, no street tools indoors.",
    spendCapCents: 100000,
    emergencyContactName: "Marcus Beaumont (owner)",
    emergencyContactPhone: "+14155551302",
    notes:
      "Furnished w/ vintage pieces — quote conservatively on anything near the dining room or library. Three cameras (Ring) front/side/garage; owner gets notified on every motion event.",
  });

  // prop_7 — 501 Funston Ave — Inner Sunset 6-unit apartment building
  store.upsertProperty({
    id: "prop_7",
    address: "501 Funston Ave",
    unit: "3",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: [
      "person_tenant_26", "person_tenant_27", "person_tenant_28", "person_tenant_29",
    ],
    propertyType: "apartment_building",
    yearBuilt: 1932,
    gateCode: "501#",
    lockboxCode: "Sunset32",
    parkingNotes:
      "Tandem two-car garage on the lower level (manager-only). Street parking on Funston is permit zone S — most days easy.",
    accessNotes:
      "Foggy and damp neighborhood — expect dampness in lower units especially in summer. Front entry on Funston, side entry via the alley for the basement.",
    waterShutoffLocation:
      "Basement, on the wall behind the garage door opener. Two valves: 'building' and 'irrigation' — close BUILDING for any unit work.",
    electricalPanelLocation:
      "Per-unit panel in the entry closet. Building main in the garage (small grey panel by the door).",
    hvacType:
      "Wall heaters in each unit (PG&E-direct gas, 1980s vintage — flag any soot smell as urgent). No AC needed in this microclimate.",
    ownerInstructions:
      "Tenants here are mostly UCSF residents — they're rarely home, give 24hr notice in writing (text). Nick Santos knows the building's cast-iron drain lines.",
    spendCapCents: 45000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes:
      "Cast-iron drain stacks original to 1932 — slowly being replaced as units turn over. Roof scheduled for replacement Fall 2026.",
  });

  // prop_8 — 388 Mission Bay Blvd S — 24-unit Mission Bay new construction
  store.upsertProperty({
    id: "prop_8",
    address: "388 Mission Bay Blvd S",
    unit: "612",
    managerId: "person_pm_1",
    ownerId: "person_owner_2",
    tenantIds: [
      "person_tenant_30", "person_tenant_31", "person_tenant_32",
      "person_tenant_33", "person_tenant_34", "person_tenant_35",
      "person_tenant_36", "person_tenant_37",
    ],
    propertyType: "condo_building",
    yearBuilt: 2021,
    gateCode: "388*",
    lockboxCode: "MBay-Svc",
    parkingNotes:
      "Loading dock on Mission Bay Blvd — 30-min limit. Garage P1/P2, contractors validate at concierge for 4hr pass. 12 EV chargers (ChargePoint) on P1.",
    accessNotes:
      "24/7 concierge + package room. Service elevator (south bank) for any tools or large items. COI required on file before contractor badges are issued. Rooftop pool/gym access is amenity-card only — concierge can issue a temp card for work.",
    waterShutoffLocation:
      "Per-unit shutoffs behind a labeled access panel inside each laundry closet. Building main in the P2 mechanical room (key with concierge).",
    electricalPanelLocation:
      "Per-unit panel inside laundry. Building switchgear in P2 — managed by Bayfront Building Services (415-555-0200).",
    hvacType:
      "Daikin VRV V heat pumps per unit (2021). Rooftop condenser bank — HVAC vendor MUST coordinate w/ HOA before rooftop access and provide fall-protection plan.",
    ownerInstructions:
      "HOA enforces a strict 9a–6p workday rule M–F. No weekend work. All contractors must wear ID badges from concierge. Owner prefers FastFix HVAC for any HVAC work (they did the building commissioning).",
    spendCapCents: 175000,
    emergencyContactName: "Marcus Beaumont (owner)",
    emergencyContactPhone: "+14155551302",
    notes:
      "New construction — most issues still under builder warranty (Strada Investment, until 2026-12-31). Always check warranty before authorizing paid work on building systems. EV-charger billing is shared — never disable a charger without notifying concierge.",
  });

  // prop_9 — 1645 Vallejo St — Russian Hill 6-unit walk-up with city views
  store.upsertProperty({
    id: "prop_9",
    address: "1645 Vallejo St",
    unit: "4",
    managerId: "person_pm_1",
    ownerId: "person_owner_1",
    tenantIds: [
      "person_tenant_38", "person_tenant_39",
      "person_tenant_40", "person_tenant_41",
    ],
    propertyType: "apartment_building",
    yearBuilt: 1915,
    gateCode: "1645",
    lockboxCode: "Vallejo15",
    parkingNotes:
      "No on-site parking — Russian Hill is permit zone Y, brutal mid-day. Contractors should use the Polk St garage (5 blocks east).",
    accessNotes:
      "1915 walk-up, four flights, no elevator. Front entry on Vallejo with a brass key (lockbox under the planter). Service entry on the alley side of the building.",
    waterShutoffLocation:
      "Basement, near the boiler. Old gate valve — turn slowly, brittle washer last replaced 2023.",
    electricalPanelLocation:
      "Per-unit panel in the kitchen. Building main in the basement next to the boiler (panel labeled Vallejo Main).",
    hvacType:
      "Steam radiators — boiler is a 1990s Burnham (no AC, no need on Russian Hill).",
    ownerInstructions:
      "Tenants here are long-term renters — be respectful, no surprises. Nick Santos has worked the building twice in the last two years. Any spend over the cap needs Priya's written approval.",
    spendCapCents: 55000,
    emergencyContactName: "Priya Kapoor (owner)",
    emergencyContactPhone: "+14155551301",
    notes:
      "Russian Hill — steep stairs, narrow stairwell. Be honest with contractors about the climb (no ladders longer than 8ft will fit up the stairwell, use the alley fire-escape for long tools).",
  });

  // -------------------------------------------------------------------------
  // Tenants for prop_3 through prop_9
  // -------------------------------------------------------------------------

  // prop_3 — Hayes Valley (6 named tenants in 12-unit building)
  store.upsertPerson({ id: "person_tenant_8",  role: "tenant", name: "Alex Battikha",  phone: "+16198974800", propertyId: "prop_3", unitId: "unit_p3_101" });
  store.upsertPerson({ id: "person_tenant_9",  role: "tenant", name: "Ezra Goldfarb",  phone: "+14155551501", propertyId: "prop_3", unitId: "unit_p3_102" });
  store.upsertPerson({ id: "person_tenant_10", role: "tenant", name: "Bea Lockwood",   phone: "+14155551502", propertyId: "prop_3", unitId: "unit_p3_201" });
  store.upsertPerson({ id: "person_tenant_11", role: "tenant", name: "Adesina Coker",  phone: "+14155551503", propertyId: "prop_3", unitId: "unit_p3_202" });
  store.upsertPerson({ id: "person_tenant_12", role: "tenant", name: "Hugo Petrov",    phone: "+14155551504", propertyId: "prop_3", unitId: "unit_p3_301" });
  store.upsertPerson({ id: "person_tenant_13", role: "tenant", name: "Yuki Tanaka",    phone: "+14155551505", propertyId: "prop_3", unitId: "unit_p3_302" });

  // prop_4 — SoMa (8 named tenants in 18-unit tower)
  store.upsertPerson({ id: "person_tenant_14", role: "tenant", name: "Reese Carmichael", phone: "+14155551510", propertyId: "prop_4", unitId: "unit_p4_405" });
  store.upsertPerson({ id: "person_tenant_15", role: "tenant", name: "Iris Nakamura",    phone: "+14155551511", propertyId: "prop_4", unitId: "unit_p4_607" });
  store.upsertPerson({ id: "person_tenant_16", role: "tenant", name: "Vikram Joshi",     phone: "+14155551512", propertyId: "prop_4", unitId: "unit_p4_805" });
  store.upsertPerson({ id: "person_tenant_17", role: "tenant", name: "Halle Brentwood",  phone: "+14155551513", propertyId: "prop_4", unitId: "unit_p4_902" });
  store.upsertPerson({ id: "person_tenant_18", role: "tenant", name: "Quincy Daley",     phone: "+14155551514", propertyId: "prop_4", unitId: "unit_p4_1104" });
  store.upsertPerson({ id: "person_tenant_19", role: "tenant", name: "Sofia Verde",      phone: "+14155551515", propertyId: "prop_4", unitId: "unit_p4_1205" });
  store.upsertPerson({ id: "person_tenant_20", role: "tenant", name: "Anand Iyer",       phone: "+14155551516", propertyId: "prop_4", unitId: "unit_p4_1402" });
  store.upsertPerson({ id: "person_tenant_21", role: "tenant", name: "Leona Park",       phone: "+14155551517", propertyId: "prop_4", unitId: "unit_p4_1602" });

  // prop_5 — Mission Victorian flats (3 tenants in 4 units)
  store.upsertPerson({ id: "person_tenant_22", role: "tenant", name: "Carmen Delarosa", phone: "+14155551520", propertyId: "prop_5", unitId: "unit_p5_lower" });
  store.upsertPerson({ id: "person_tenant_23", role: "tenant", name: "Joaquin Ribeiro", phone: "+14155551521", propertyId: "prop_5", unitId: "unit_p5_mid" });
  store.upsertPerson({ id: "person_tenant_24", role: "tenant", name: "Tomas Aguilar",   phone: "+14155551522", propertyId: "prop_5", unitId: "unit_p5_upper_front" });

  // prop_6 — Pac Heights mansion (1 tenant, family)
  store.upsertPerson({ id: "person_tenant_25", role: "tenant", name: "The Hartwell Family", phone: "+14155551530", email: "j.hartwell@hartwell-co.com", propertyId: "prop_6", unitId: "unit_p6_main" });

  // prop_7 — Inner Sunset (4 tenants in 6 units, mostly UCSF residents)
  store.upsertPerson({ id: "person_tenant_26", role: "tenant", name: "Dr. Inez Salvador", phone: "+14155551540", propertyId: "prop_7", unitId: "unit_p7_1" });
  store.upsertPerson({ id: "person_tenant_27", role: "tenant", name: "Dr. Owen Whitley",  phone: "+14155551541", propertyId: "prop_7", unitId: "unit_p7_2" });
  store.upsertPerson({ id: "person_tenant_28", role: "tenant", name: "Niko Reinholt",     phone: "+14155551542", propertyId: "prop_7", unitId: "unit_p7_3" });
  store.upsertPerson({ id: "person_tenant_29", role: "tenant", name: "Dr. Ada Mwangi",    phone: "+14155551543", propertyId: "prop_7", unitId: "unit_p7_5" });

  // prop_8 — Mission Bay (8 named tenants in 24-unit tower)
  store.upsertPerson({ id: "person_tenant_30", role: "tenant", name: "Saoirse Donovan",  phone: "+14155551550", propertyId: "prop_8", unitId: "unit_p8_408" });
  store.upsertPerson({ id: "person_tenant_31", role: "tenant", name: "Mateo Velazquez",  phone: "+14155551551", propertyId: "prop_8", unitId: "unit_p8_510" });
  store.upsertPerson({ id: "person_tenant_32", role: "tenant", name: "Priscilla Quinn",  phone: "+14155551552", propertyId: "prop_8", unitId: "unit_p8_612" });
  store.upsertPerson({ id: "person_tenant_33", role: "tenant", name: "Devon Ashworth",   phone: "+14155551553", propertyId: "prop_8", unitId: "unit_p8_708" });
  store.upsertPerson({ id: "person_tenant_34", role: "tenant", name: "Aanya Krishnan",   phone: "+14155551554", propertyId: "prop_8", unitId: "unit_p8_812" });
  store.upsertPerson({ id: "person_tenant_35", role: "tenant", name: "Lucas Beaumont",   phone: "+14155551555", propertyId: "prop_8", unitId: "unit_p8_1010" });
  store.upsertPerson({ id: "person_tenant_36", role: "tenant", name: "Esther Goldfarb",  phone: "+14155551556", propertyId: "prop_8", unitId: "unit_p8_1208" });
  store.upsertPerson({ id: "person_tenant_37", role: "tenant", name: "Rashid Hamdan",    phone: "+14155551557", propertyId: "prop_8", unitId: "unit_p8_1410" });

  // prop_9 — Russian Hill (4 tenants in 6 units)
  store.upsertPerson({ id: "person_tenant_38", role: "tenant", name: "Imogen Whitlock",  phone: "+14155551560", propertyId: "prop_9", unitId: "unit_p9_1" });
  store.upsertPerson({ id: "person_tenant_39", role: "tenant", name: "Felix Brennan",    phone: "+14155551561", propertyId: "prop_9", unitId: "unit_p9_3" });
  store.upsertPerson({ id: "person_tenant_40", role: "tenant", name: "Jin-soo Park",     phone: "+14155551562", propertyId: "prop_9", unitId: "unit_p9_4" });
  store.upsertPerson({ id: "person_tenant_41", role: "tenant", name: "Cosima Andrade",   phone: "+14155551563", propertyId: "prop_9", unitId: "unit_p9_6" });

  // -------------------------------------------------------------------------
  // Units for prop_3 through prop_7
  // -------------------------------------------------------------------------

  // prop_3 — 2151 Hayes (12 units, no elevator, Edwardian)
  store.upsertUnit({ id: "unit_p3_101", propertyId: "prop_3", label: "101", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 620, lockboxCode: "1101", tenantIds: ["person_tenant_8"],  notes: "Garden-level — recurring fog moisture along Hayes-side wall." });
  store.upsertUnit({ id: "unit_p3_102", propertyId: "prop_3", label: "102", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 640, lockboxCode: "1102", tenantIds: ["person_tenant_9"],  notes: "Back unit, faces alley — quiet but dim." });
  store.upsertUnit({ id: "unit_p3_103", propertyId: "prop_3", label: "103", floor: 1, bedrooms: 2, bathrooms: 1, sqft: 820, tenantIds: [], vacant: true, notes: "Vacant — Spanish-tile bath redo scheduled May." });
  store.upsertUnit({ id: "unit_p3_201", propertyId: "prop_3", label: "201", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 660, lockboxCode: "2201", tenantIds: ["person_tenant_10"], notes: "Bay window over Hayes." });
  store.upsertUnit({ id: "unit_p3_202", propertyId: "prop_3", label: "202", floor: 2, bedrooms: 2, bathrooms: 1, sqft: 880, lockboxCode: "2202", tenantIds: ["person_tenant_11"], notes: "Refinished hardwoods 2023. Friendly dog on premises (Bingo, golden retriever)." });
  store.upsertUnit({ id: "unit_p3_203", propertyId: "prop_3", label: "203", floor: 2, bedrooms: 2, bathrooms: 1, sqft: 880, tenantIds: [], vacant: true, notes: "Vacant — listed, tours via owner." });
  store.upsertUnit({ id: "unit_p3_301", propertyId: "prop_3", label: "301", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 690, lockboxCode: "2301", tenantIds: ["person_tenant_12"], notes: "Skylight in living room — leaks during heavy storms (last patched Dec 2024)." });
  store.upsertUnit({ id: "unit_p3_302", propertyId: "prop_3", label: "302", floor: 3, bedrooms: 2, bathrooms: 1, sqft: 920, lockboxCode: "2302", tenantIds: ["person_tenant_13"], notes: "Crown molding original 1908 — flag any drilling near it." });
  store.upsertUnit({ id: "unit_p3_303", propertyId: "prop_3", label: "303", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 700, tenantIds: [], vacant: true, notes: "Vacant — kitchen reno in progress." });
  store.upsertUnit({ id: "unit_p3_401", propertyId: "prop_3", label: "401 (top)", floor: 4, bedrooms: 2, bathrooms: 2, sqft: 1080, lockboxCode: "2401", tenantIds: [], vacant: true, notes: "Top-floor — best light, roof access via hall hatch." });
  store.upsertUnit({ id: "unit_p3_402", propertyId: "prop_3", label: "402 (top)", floor: 4, bedrooms: 2, bathrooms: 2, sqft: 1080, lockboxCode: "2402", tenantIds: [], vacant: true, notes: "Vacant — listed at $5,400/mo." });
  store.upsertUnit({ id: "unit_p3_basement", propertyId: "prop_3", label: "Basement studio", floor: 0, bedrooms: 0, bathrooms: 1, sqft: 380, tenantIds: [], vacant: true, notes: "Not currently rented — used for storage of building materials." });

  // prop_4 — 789 Brannan (18 units in a high-rise, lobby + concierge)
  store.upsertUnit({ id: "unit_p4_201", propertyId: "prop_4", label: "201", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 720, tenantIds: [], vacant: true, notes: "Vacant — short-term-rental allowed by HOA (max 6 mo/yr)." });
  store.upsertUnit({ id: "unit_p4_305", propertyId: "prop_4", label: "305", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 740, tenantIds: [], vacant: true, notes: "Vacant — south-facing." });
  store.upsertUnit({ id: "unit_p4_405", propertyId: "prop_4", label: "405", floor: 4, bedrooms: 1, bathrooms: 1, sqft: 760, lockboxCode: "0405", tenantIds: ["person_tenant_14"], ownership: "owner_occupied", notes: "Owner-occupant works from home, schedule between 10a–4p only." });
  store.upsertUnit({ id: "unit_p4_502", propertyId: "prop_4", label: "502", floor: 5, bedrooms: 2, bathrooms: 2, sqft: 1050, tenantIds: [], vacant: true, notes: "Vacant — recently re-painted." });
  store.upsertUnit({ id: "unit_p4_607", propertyId: "prop_4", label: "607", floor: 6, bedrooms: 2, bathrooms: 2, sqft: 1080, lockboxCode: "0607", tenantIds: ["person_tenant_15"], ownership: "rental", notes: "Pet on file: cat (Pippin, calico). Allergy notes in file. Unit landlord pays for repairs." });
  store.upsertUnit({ id: "unit_p4_805", propertyId: "prop_4", label: "805", floor: 8, bedrooms: 2, bathrooms: 2, sqft: 1120, lockboxCode: "0805", tenantIds: ["person_tenant_16"], ownership: "owner_occupied", notes: "Owner-occupant. Wine fridge in kitchen — bring on quotes if dishwasher work touches the cabinetry around it." });
  store.upsertUnit({ id: "unit_p4_902", propertyId: "prop_4", label: "902", floor: 9, bedrooms: 1, bathrooms: 1, sqft: 780, lockboxCode: "0902", tenantIds: ["person_tenant_17"], ownership: "owner_occupied", notes: "Owner-occupant. Heated floors in bathroom — Nuheat thermostat under the vanity if work needed." });
  store.upsertUnit({ id: "unit_p4_1003", propertyId: "prop_4", label: "1003", floor: 10, bedrooms: 2, bathrooms: 2, sqft: 1140, tenantIds: [], vacant: true, notes: "Vacant — recent water-intrusion repair complete, paint touch-up pending." });
  store.upsertUnit({ id: "unit_p4_1104", propertyId: "prop_4", label: "1104", floor: 11, bedrooms: 2, bathrooms: 2, sqft: 1180, lockboxCode: "1104", tenantIds: ["person_tenant_18"], ownership: "owner_occupied", notes: "Owner-occupant. Smart-home — Lutron everything. Check the app for current scene states before flipping switches." });
  store.upsertUnit({ id: "unit_p4_1205", propertyId: "prop_4", label: "1205", floor: 12, bedrooms: 2, bathrooms: 2, sqft: 1200, lockboxCode: "1205", tenantIds: ["person_tenant_19"], ownership: "rental", notes: "Newborn in unit — coordinate work hours via app, NO mid-day power-tools. Unit landlord pays for repairs." });
  store.upsertUnit({ id: "unit_p4_1302", propertyId: "prop_4", label: "1302", floor: 13, bedrooms: 1, bathrooms: 1, sqft: 800, tenantIds: [], vacant: true, notes: "Vacant — short-term staged for showings." });
  store.upsertUnit({ id: "unit_p4_1402", propertyId: "prop_4", label: "1402", floor: 14, bedrooms: 2, bathrooms: 2, sqft: 1240, lockboxCode: "1402", tenantIds: ["person_tenant_20"], ownership: "owner_occupied", notes: "VIP unit — coordinate with owner direct for anything over $2k." });
  store.upsertUnit({ id: "unit_p4_1504", propertyId: "prop_4", label: "1504", floor: 15, bedrooms: 2, bathrooms: 2, sqft: 1260, tenantIds: [], vacant: true, notes: "Vacant — corner unit, panoramic SoMa view." });
  store.upsertUnit({ id: "unit_p4_1602", propertyId: "prop_4", label: "1602", floor: 16, bedrooms: 3, bathrooms: 2, sqft: 1480, lockboxCode: "1602", tenantIds: ["person_tenant_21"], ownership: "rental", notes: "Renter. Heated towel rack in primary bath — Mr. Steam install, vendor on file. Unit landlord pays for repairs." });
  store.upsertUnit({ id: "unit_p4_1701", propertyId: "prop_4", label: "1701 (PH)", floor: 17, bedrooms: 3, bathrooms: 3, sqft: 1820, tenantIds: [], vacant: true, spendCapCents: 250000, notes: "Penthouse — owner-occupied unit, vacant Apr–Sep while owner is in NYC." });
  store.upsertUnit({ id: "unit_p4_1702", propertyId: "prop_4", label: "1702 (PH)", floor: 17, bedrooms: 3, bathrooms: 3, sqft: 1820, tenantIds: [], vacant: true, spendCapCents: 250000, notes: "Penthouse — currently listed for $9,800/mo. Tours via concierge." });
  store.upsertUnit({ id: "unit_p4_g01", propertyId: "prop_4", label: "G01 (live/work)", floor: 1, bedrooms: 0, bathrooms: 1, sqft: 950, tenantIds: [], vacant: true, notes: "Ground-floor live/work — separate Brannan St entry. Currently vacant." });
  store.upsertUnit({ id: "unit_p4_g02", propertyId: "prop_4", label: "G02 (live/work)", floor: 1, bedrooms: 0, bathrooms: 1, sqft: 950, tenantIds: [], vacant: true, notes: "Ground-floor live/work — used as a pop-up gallery quarterly." });

  // prop_5 — 3445 17th St (4-unit Victorian)
  store.upsertUnit({ id: "unit_p5_lower", propertyId: "prop_5", label: "Lower (garden)", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 720, lockboxCode: "1701", tenantIds: ["person_tenant_22"], notes: "Garden unit — back patio access via Dutch door in kitchen." });
  store.upsertUnit({ id: "unit_p5_mid", propertyId: "prop_5", label: "Middle", floor: 2, bedrooms: 2, bathrooms: 1, sqft: 980, lockboxCode: "1702", tenantIds: ["person_tenant_23"], notes: "Bay window faces 17th St. Original pocket doors — flag any wall work near them." });
  store.upsertUnit({ id: "unit_p5_upper_front", propertyId: "prop_5", label: "Upper Front", floor: 3, bedrooms: 2, bathrooms: 1, sqft: 1020, lockboxCode: "1703", tenantIds: ["person_tenant_24"], notes: "Tenant is hard of hearing — ALWAYS text first, do not just ring the bell." });
  store.upsertUnit({ id: "unit_p5_upper_back", propertyId: "prop_5", label: "Upper Back", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 720, tenantIds: [], vacant: true, notes: "Vacant — last tenant moved out March, no current showings (planning kitchen reno first)." });

  // prop_6 — 2400 Steiner (single-family, one unit)
  store.upsertUnit({ id: "unit_p6_main", propertyId: "prop_6", label: "Main", floor: 1, bedrooms: 5, bathrooms: 4, sqft: 4200, lockboxCode: "2400#", tenantIds: ["person_tenant_25"], spendCapCents: 200000, notes: "Whole-home rental to the Hartwell family. NO street tools indoors — runners + shoe covers required. Three Ring cameras alert the owner on every motion event." });

  // prop_7 — 501 Funston (6-unit Sunset apartments)
  store.upsertUnit({ id: "unit_p7_1", propertyId: "prop_7", label: "1 (garden)", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 580, lockboxCode: "5011", tenantIds: ["person_tenant_26"], notes: "Damp in summer fog — dehumidifier in front closet. Tenant is on UCSF call schedule, may be sleeping odd hours." });
  store.upsertUnit({ id: "unit_p7_2", propertyId: "prop_7", label: "2", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 600, lockboxCode: "5012", tenantIds: ["person_tenant_27"], notes: "Tenant works night shift Tue/Thu — no work those mornings." });
  store.upsertUnit({ id: "unit_p7_3", propertyId: "prop_7", label: "3", floor: 2, bedrooms: 2, bathrooms: 1, sqft: 780, lockboxCode: "5013", tenantIds: ["person_tenant_28"], notes: "Wall heater pilot blew out twice this winter — replace, do not relight." });
  store.upsertUnit({ id: "unit_p7_4", propertyId: "prop_7", label: "4", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 600, tenantIds: [], vacant: true, notes: "Vacant — listed at $2,950/mo, no current showings." });
  store.upsertUnit({ id: "unit_p7_5", propertyId: "prop_7", label: "5", floor: 3, bedrooms: 2, bathrooms: 1, sqft: 780, lockboxCode: "5015", tenantIds: ["person_tenant_29"], notes: "Tenant is a research fellow — quiet hours respected. Filing cabinets near the window, take care with the floor." });
  store.upsertUnit({ id: "unit_p7_6", propertyId: "prop_7", label: "6 (top)", floor: 3, bedrooms: 2, bathrooms: 1, sqft: 820, tenantIds: [], vacant: true, notes: "Vacant — top-floor unit, recently re-painted, waiting for a renter." });

  // prop_8 — 388 Mission Bay Blvd S (24 units, new construction)
  store.upsertUnit({ id: "unit_p8_201", propertyId: "prop_8", label: "201", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 690, tenantIds: [], vacant: true, notes: "Vacant — facing Mission Bay Blvd, expect more street noise." });
  store.upsertUnit({ id: "unit_p8_205", propertyId: "prop_8", label: "205", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 700, tenantIds: [], vacant: true, notes: "Vacant — staged for showings." });
  store.upsertUnit({ id: "unit_p8_308", propertyId: "prop_8", label: "308", floor: 3, bedrooms: 2, bathrooms: 2, sqft: 1050, tenantIds: [], vacant: true, notes: "Vacant — Bosch package still under warranty." });
  store.upsertUnit({ id: "unit_p8_312", propertyId: "prop_8", label: "312", floor: 3, bedrooms: 2, bathrooms: 2, sqft: 1050, tenantIds: [], vacant: true, notes: "Vacant — south-facing." });
  store.upsertUnit({ id: "unit_p8_408", propertyId: "prop_8", label: "408", floor: 4, bedrooms: 1, bathrooms: 1, sqft: 720, lockboxCode: "0408", tenantIds: ["person_tenant_30"], notes: "Tenant works night shift at UCSF Mission Bay — coordinate after 2pm." });
  store.upsertUnit({ id: "unit_p8_510", propertyId: "prop_8", label: "510", floor: 5, bedrooms: 2, bathrooms: 2, sqft: 1080, lockboxCode: "0510", tenantIds: ["person_tenant_31"], notes: "Family with toddler — no power tools 12p–2p (nap time)." });
  store.upsertUnit({ id: "unit_p8_612", propertyId: "prop_8", label: "612", floor: 6, bedrooms: 2, bathrooms: 2, sqft: 1080, lockboxCode: "0612", tenantIds: ["person_tenant_32"], notes: "Smart-home enthusiast — Lutron + Sonos. Check app before flipping switches." });
  store.upsertUnit({ id: "unit_p8_708", propertyId: "prop_8", label: "708", floor: 7, bedrooms: 1, bathrooms: 1, sqft: 720, lockboxCode: "0708", tenantIds: ["person_tenant_33"], notes: "Single occupant, works onsite at Mission Bay — easy to coordinate weekdays." });
  store.upsertUnit({ id: "unit_p8_812", propertyId: "prop_8", label: "812", floor: 8, bedrooms: 2, bathrooms: 2, sqft: 1100, lockboxCode: "0812", tenantIds: ["person_tenant_34"], notes: "Heated towel rack in primary — Mr. Steam, vendor on file." });
  store.upsertUnit({ id: "unit_p8_908", propertyId: "prop_8", label: "908", floor: 9, bedrooms: 1, bathrooms: 1, sqft: 740, tenantIds: [], vacant: true, notes: "Vacant — listed at $4,400/mo." });
  store.upsertUnit({ id: "unit_p8_1010", propertyId: "prop_8", label: "1010", floor: 10, bedrooms: 2, bathrooms: 2, sqft: 1120, lockboxCode: "1010", tenantIds: ["person_tenant_35"], notes: "Tenant is owner's nephew — bill the owner direct, not the tenant." });
  store.upsertUnit({ id: "unit_p8_1108", propertyId: "prop_8", label: "1108", floor: 11, bedrooms: 1, bathrooms: 1, sqft: 740, tenantIds: [], vacant: true, notes: "Vacant — staged for showings." });
  store.upsertUnit({ id: "unit_p8_1208", propertyId: "prop_8", label: "1208", floor: 12, bedrooms: 2, bathrooms: 2, sqft: 1140, lockboxCode: "1208", tenantIds: ["person_tenant_36"], notes: "Tenant has elderly mother visiting — text first, no after-7pm work." });
  store.upsertUnit({ id: "unit_p8_1310", propertyId: "prop_8", label: "1310", floor: 13, bedrooms: 2, bathrooms: 2, sqft: 1160, tenantIds: [], vacant: true, notes: "Vacant — listed at $5,900/mo, corner unit." });
  store.upsertUnit({ id: "unit_p8_1410", propertyId: "prop_8", label: "1410", floor: 14, bedrooms: 3, bathrooms: 2, sqft: 1480, lockboxCode: "1410", tenantIds: ["person_tenant_37"], notes: "Live/work for a small design studio — workspace in second bedroom." });
  store.upsertUnit({ id: "unit_p8_1508", propertyId: "prop_8", label: "1508 (PH)", floor: 15, bedrooms: 3, bathrooms: 3, sqft: 1880, tenantIds: [], vacant: true, spendCapCents: 300000, notes: "Penthouse — vacant, currently owner-staged for sale." });
  store.upsertUnit({ id: "unit_p8_g01", propertyId: "prop_8", label: "G01 (retail)", floor: 1, bedrooms: 0, bathrooms: 1, sqft: 1200, tenantIds: [], vacant: true, notes: "Ground-floor retail — currently a coffee popup (Saint Frank). Lease ends Dec." });
  store.upsertUnit({ id: "unit_p8_g02", propertyId: "prop_8", label: "G02 (retail)", floor: 1, bedrooms: 0, bathrooms: 1, sqft: 1100, tenantIds: [], vacant: true, notes: "Ground-floor retail — under LOI to a Pilates studio (closing May)." });
  store.upsertUnit({ id: "unit_p8_405", propertyId: "prop_8", label: "405", floor: 4, bedrooms: 1, bathrooms: 1, sqft: 700, tenantIds: [], vacant: true, notes: "Vacant — staged for short-term rental program." });
  store.upsertUnit({ id: "unit_p8_502", propertyId: "prop_8", label: "502", floor: 5, bedrooms: 1, bathrooms: 1, sqft: 740, tenantIds: [], vacant: true, notes: "Vacant — recent paint touch-up." });
  store.upsertUnit({ id: "unit_p8_602", propertyId: "prop_8", label: "602", floor: 6, bedrooms: 1, bathrooms: 1, sqft: 740, tenantIds: [], vacant: true, notes: "Vacant — east-facing, gets early sun." });
  store.upsertUnit({ id: "unit_p8_705", propertyId: "prop_8", label: "705", floor: 7, bedrooms: 2, bathrooms: 2, sqft: 1080, tenantIds: [], vacant: true, notes: "Vacant — listed at $5,200/mo." });
  store.upsertUnit({ id: "unit_p8_802", propertyId: "prop_8", label: "802", floor: 8, bedrooms: 1, bathrooms: 1, sqft: 760, tenantIds: [], vacant: true, notes: "Vacant — recent paint touch-up." });
  store.upsertUnit({ id: "unit_p8_902", propertyId: "prop_8", label: "902", floor: 9, bedrooms: 2, bathrooms: 2, sqft: 1100, tenantIds: [], vacant: true, notes: "Vacant — owner is reviewing rent strategy for upper floors." });

  // prop_9 — 1645 Vallejo St (6 units, Russian Hill walk-up)
  store.upsertUnit({ id: "unit_p9_1", propertyId: "prop_9", label: "1 (garden)", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 620, lockboxCode: "1645", tenantIds: ["person_tenant_38"], notes: "Garden unit — patio access via French doors in kitchen. Tenant has Bay Bridge view from the back window." });
  store.upsertUnit({ id: "unit_p9_2", propertyId: "prop_9", label: "2", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 640, tenantIds: [], vacant: true, notes: "Vacant — recent kitchen reno just wrapped." });
  store.upsertUnit({ id: "unit_p9_3", propertyId: "prop_9", label: "3", floor: 2, bedrooms: 2, bathrooms: 1, sqft: 820, lockboxCode: "Vallejo3", tenantIds: ["person_tenant_39"], notes: "Original wainscoting in dining — flag for any wall work." });
  store.upsertUnit({ id: "unit_p9_4", propertyId: "prop_9", label: "4", floor: 3, bedrooms: 2, bathrooms: 1, sqft: 840, lockboxCode: "Vallejo4", tenantIds: ["person_tenant_40"], notes: "Tenant has Bay + Golden Gate view from the bay window. Long-term renter, very particular about scheduling — text 48hr in advance." });
  store.upsertUnit({ id: "unit_p9_5", propertyId: "prop_9", label: "5", floor: 4, bedrooms: 1, bathrooms: 1, sqft: 660, tenantIds: [], vacant: true, notes: "Vacant — listed at $3,400/mo, four-flight walkup discounts apply." });
  store.upsertUnit({ id: "unit_p9_6", propertyId: "prop_9", label: "6 (top)", floor: 4, bedrooms: 2, bathrooms: 1, sqft: 920, lockboxCode: "Vallejo6", tenantIds: ["person_tenant_41"], notes: "Top-floor — skylight in primary bath, leaks every El Niño. Skylight scheduled for replacement Fall 2026." });

  // Sponge requires recipient addresses to be allowlisted on the source wallet.
  // Every contractor payout settles into Handle's contractor-escrow wallet on
  // Solana (verifiable on Solscan via the txn hash recorded on the job). In
  // production this on-chain step is followed by a USDC → USD ACH off-ramp into
  // the contractor's bank account — Sponge's banking rail handles that leg.
  const HANDLE_CONTRACTOR_ESCROW = "AzSqf7aAND7iwjFyPqakki7XQ5ogMwSxqhp3cmGCvvcU";

  // Contractor pool — Bay Area vendors Handle dispatches to.
  // Wallets on file get instant USDC payouts via Sponge; others get a check.
  const contractors = [
    // Plumbing
    { id: "ctr_1", name: "Bay Area Wall Fixes", phone: "+19853381645", trades: ["general"], rating: 4.9, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Drywall, plaster, and interior paint. Same-day patch + texture-matching. Owner-operator picks up on the first ring. COI on file." },
    { id: "ctr_6", name: "Roto-Rooter SF",         phone: "+14155552006", trades: ["plumbing"], rating: 4.3, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Big-name backup for plumbing emergencies." },
    { id: "ctr_7", name: "Sunset Drain Pros",      phone: "+14155552007", trades: ["plumbing"], rating: 4.7, city: "San Francisco", notes: "Drain specialists. Snake + hydro-jet. No new construction." },
    // Electrical
    { id: "ctr_8",  name: "Pacific Power Works",   phone: "+14155552008", trades: ["electrical"], rating: 4.5, city: "San Francisco", notes: "Strong on EV charger installs + service upgrades." },
    { id: "ctr_9",  name: "Bay Knob-and-Tube Specialists", phone: "+14155552009", trades: ["electrical"], rating: 4.8, city: "San Francisco", notes: "Niche — Victorian rewires. Two-week lead time but worth it." },
    // HVAC
    { id: "ctr_3",  name: "FastFix HVAC",          phone: "+14155552003", trades: ["hvac"], rating: 4.4, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Commissioned 388 Mission Bay Blvd S. Daikin & Mitsubishi certified." },
    { id: "ctr_10", name: "Diablo Power & HVAC",   phone: "+14155552010", trades: ["hvac"], rating: 4.6, city: "Concord", notes: "East Bay base. Generator service for 2400 Steiner." },
    { id: "ctr_11", name: "City Boiler Service",   phone: "+14155552011", trades: ["hvac"], rating: 4.9, city: "San Francisco", notes: "Old radiator boilers — they know the 2151 Hayes Burnham by name." },
    // Locksmith
    { id: "ctr_4",  name: "GoldenGate Locksmith",  phone: "+14155552004", trades: ["locksmith"], rating: 4.9, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Best response time in SF (avg 22 min). Smart-lock certified." },
    { id: "ctr_12", name: "Mission Lock & Key",    phone: "+14155552012", trades: ["locksmith"], rating: 4.4, city: "San Francisco", notes: "Walk-in shop on Mission. Cheaper for non-emergency rekey." },
    // Appliance
    { id: "ctr_13", name: "SF Appliance Doctor",   phone: "+14155552013", trades: ["appliance"], rating: 4.7, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Authorized Bosch + Sub-Zero. Will check warranty first." },
    { id: "ctr_14", name: "Mr. Fix-it Appliances", phone: "+14155552014", trades: ["appliance"], rating: 4.3, city: "Daly City", notes: "Budget option. Honest about when a unit is end-of-life." },
    // General / handy
    { id: "ctr_5",  name: "All-Around Handy",      phone: "+14155552005", trades: ["general", "appliance"], rating: 4.5, city: "Oakland", notes: "Solid generalist. Great for punch-list days on turnovers." },
    { id: "ctr_15", name: "TaskRabbit Pro Network", phone: "+14155552015", trades: ["general"], rating: 4.2, city: "San Francisco", notes: "Routed via TR API. Same-day for small jobs under $200." },
    // Pest / Cleaning / Roofing / Landscaping
    { id: "ctr_16", name: "Cascade Pest Control",  phone: "+14155552016", trades: ["pest_control"], rating: 4.6, city: "San Francisco", notes: "Quarterly contract for prop_1 + prop_3. Eco-friendly options." },
    { id: "ctr_17", name: "Sparkle SF Cleaning",   phone: "+14155552017", trades: ["cleaning"], rating: 4.8, city: "San Francisco", walletAddress: HANDLE_CONTRACTOR_ESCROW, notes: "Turnover cleans. Brings their own supplies." },
    { id: "ctr_18", name: "Bay Roofers",           phone: "+14155552018", trades: ["roofing"], rating: 4.9, city: "San Francisco", notes: "Did 342 Valencia roof in 2022 — warranty active. Storm response within 4hr." },
    { id: "ctr_19", name: "Presidio Landscaping",  phone: "+14155552019", trades: ["landscaping"], rating: 4.5, city: "San Francisco", notes: "Monthly maintenance for 2400 Steiner. Hardscape too." },
    // Browser-Use discovered (newer, no rating yet)
    { id: "ctr_20", name: "Trace Mechanical (HVAC)", phone: "+14155552020", trades: ["hvac"], rating: 4.1, city: "San Francisco", notes: "Discovered via Browser Use search 2026-04. First job pending.", source: "browser_use" as const },
    { id: "ctr_21", name: "Castro Drain & Pipe",   phone: "+14155552021", trades: ["plumbing"], rating: 4.0, city: "San Francisco", notes: "Discovered via Browser Use search 2026-03 (Castro neighborhood specialist).", source: "browser_use" as const },
  ] as const;
  for (const c of contractors) {
    const { source, ...rest } = c as typeof c & { source?: "directory" | "browser_use" | "manual" };
    store.upsertContractor({ ...rest, trades: [...rest.trades], source: source ?? "directory" });
  }

  // One in-flight job, one completed, one new
  const now = Date.now();
  const iso = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  store.upsertJob({
    id: "job_seed_active",
    propertyId: "prop_1",
    reportedByPersonId: "person_tenant_1",
    status: "in_progress",
    urgency: "urgent",
    trade: "general",
    title: "Wall repair + repaint in bedroom",
    description: "Tenant reports a hole in the bedroom wall (approx 6 inches) and requests patch + repaint before the upcoming move-out inspection.",
    callIds: ["call_seed_1"],
    assignedContractorId: "ctr_1",
  });

  // The "deal" the outbound dispatch call locked in — populated by the
  // /api/calls/outbound webhook in production. Seeded here so the demo
  // shows the negotiated price + ETA on the job detail page without
  // requiring a live call.
  store.contractorCalls.set("ctr_call_seed_active", {
    id: "ctr_call_seed_active",
    jobId: "job_seed_active",
    contractorId: "ctr_1",
    startedAt: iso(7),
    endedAt: iso(5),
    outcome: "accepted_job",
    quotedPriceCents: 22000,
    etaWindow: "today 3–5pm",
    transcriptSummary:
      "Bay Area Wall Fixes matched the $200 anchor and committed to a 3–5pm arrival window. Drywall patch + texture-matched repaint.",
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
      { at: iso(11), speaker: "caller", text: "I've got a hole in the bedroom wall — needs to be patched and repainted before my move-out inspection." },
      { at: iso(11), speaker: "agent", text: "Got it — drywall patch + repaint. I'll dispatch a general contractor now and confirm the ETA back to you." },
    ],
    summary: "Bedroom wall hole — patch + repaint requested. Tenant in unit 3B at 342 Valencia.",
    intent: "maintenance.general.drywall",
    jobId: "job_seed_active",
  });

  store.appendEvent({ jobId: "job_seed_active", kind: "call_received", title: "Tenant call received", detail: "Marcus Chen — bedroom wall hole, needs patch + repaint", at: iso(12) });
  store.appendEvent({ jobId: "job_seed_active", kind: "intent_classified", title: "Classified as general · urgent", at: iso(11) });
  store.appendEvent({ jobId: "job_seed_active", kind: "diagnosed", title: "Diagnosed: drywall patch + texture-matched repaint", detail: "Approx 6 inch hole. Standard patch, sand, prime, repaint.", at: iso(10) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_search_started", title: "Searching for drywall/painters within 5 miles", at: iso(9) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_search_completed", title: "Found 3 candidates", data: { contractorIds: ["ctr_1"] }, at: iso(8) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_dial_started", title: "Dialing Bay Area Wall Fixes", at: iso(7) });
  store.appendEvent({ jobId: "job_seed_active", kind: "contractor_assigned", title: "Assigned Bay Area Wall Fixes", detail: "Quote accepted: ETA 30 min", at: iso(5) });
  store.appendEvent({ jobId: "job_seed_active", kind: "work_started", title: "Contractor on-site", at: iso(2) });

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

  // Historical paid jobs — pulled from DEMO_PAYOUT_HISTORY at top of file.
  const contractorName = (id: string): string =>
    contractors.find((c) => c.id === id)?.name ?? "Contractor";
  const dollars = (cents: number): string =>
    `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  for (const h of DEMO_PAYOUT_HISTORY) {
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
