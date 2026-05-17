import { store } from "@/lib/store/memory";
import { moss } from "@/lib/integrations/moss";
import { supermemory } from "@/lib/integrations/supermemory";

let seeded = false;

const SEED_CONTRACTORS = [
  // Real test contractor for end-to-end live dial testing — rings Nicolas's
  // test line. Listed first so it's always in the top-3 dial pool for any
  // trade Gemini classifies a call into.
  { name: "Live Test Plumber", phone: "+16198974800", trades: ["plumbing", "electrical", "hvac", "appliance", "general"], city: "San Francisco", rating: 5.0, specialties: ["live demo", "kitchen sink", "leak", "lockout", "AC repair", "no power"] },
  { name: "AcmePlumb", phone: "+14155550101", trades: ["plumbing"], city: "San Francisco", rating: 4.9, specialties: ["leak", "kitchen sink", "p-trap", "emergency 24h", "garbage disposal"] },
  { name: "Bay Drain Pros", phone: "+14155550102", trades: ["plumbing"], city: "San Francisco", rating: 4.7, specialties: ["drain cleaning", "hydro jet", "sewer line"] },
  { name: "Mission Plumbing & Heating", phone: "+14155550103", trades: ["plumbing", "hvac"], city: "San Francisco", rating: 4.8, specialties: ["boiler", "water heater", "victorian old plumbing"] },
  { name: "SF Quick Locks", phone: "+14155550104", trades: ["locksmith"], city: "San Francisco", rating: 4.9, specialties: ["deadbolt rekey", "lockout", "smart lock install"] },
  { name: "Sunset Locksmith", phone: "+14155550105", trades: ["locksmith"], city: "San Francisco", rating: 4.6, specialties: ["emergency lockout", "key duplication"] },
  { name: "Marina Electric", phone: "+14155550106", trades: ["electrical"], city: "San Francisco", rating: 4.8, specialties: ["panel upgrade", "code-compliant rewires", "EV charger install"] },
  { name: "Hayes Wiring Co", phone: "+14155550107", trades: ["electrical"], city: "San Francisco", rating: 4.7, specialties: ["GFCI", "lighting", "circuit tracing"] },
  { name: "Bayview Electric Service", phone: "+14155550108", trades: ["electrical"], city: "San Francisco", rating: 4.5, specialties: ["commercial", "tenant improvement"] },
  { name: "Cool Bay HVAC", phone: "+14155550109", trades: ["hvac"], city: "San Francisco", rating: 4.8, specialties: ["AC", "heat pump", "thermostat"] },
  { name: "Golden Gate Heating", phone: "+14155550110", trades: ["hvac"], city: "San Francisco", rating: 4.7, specialties: ["furnace", "boiler", "ductless mini-split"] },
  { name: "Mission Appliance Repair", phone: "+14155550111", trades: ["appliance"], city: "San Francisco", rating: 4.6, specialties: ["dishwasher", "washer", "dryer", "fridge"] },
  { name: "Bay Appliance Techs", phone: "+14155550112", trades: ["appliance"], city: "San Francisco", rating: 4.8, specialties: ["range", "oven", "ice maker"] },
  { name: "Sunset Roofing", phone: "+14155550113", trades: ["roofing"], city: "San Francisco", rating: 4.7, specialties: ["leak repair", "flat roof", "gutters"] },
  { name: "Pacific Roof Co", phone: "+14155550114", trades: ["roofing"], city: "San Francisco", rating: 4.6, specialties: ["torch down", "skylight"] },
  { name: "Castro Pest Solutions", phone: "+14155550115", trades: ["pest_control"], city: "San Francisco", rating: 4.7, specialties: ["roaches", "rodents", "bedbugs"] },
  { name: "SF Eco Pest", phone: "+14155550116", trades: ["pest_control"], city: "San Francisco", rating: 4.5, specialties: ["green treatment", "ants"] },
  { name: "FreshClean SF", phone: "+14155550117", trades: ["cleaning"], city: "San Francisco", rating: 4.8, specialties: ["move-out", "deep clean", "carpet"] },
  { name: "Mission Handyman", phone: "+14155550118", trades: ["general"], city: "San Francisco", rating: 4.7, specialties: ["drywall patch", "paint touch-up", "TV mount"] },
  { name: "Richmond Garden Crew", phone: "+14155550119", trades: ["landscaping"], city: "San Francisco", rating: 4.6, specialties: ["pruning", "drought-tolerant", "irrigation"] },
  { name: "Excelsior General Repair", phone: "+14155550120", trades: ["general"], city: "San Francisco", rating: 4.5, specialties: ["odd jobs", "fence", "door fit"] },
] as const;

const SEED_KNOWLEDGE = [
  { id: "kb_001", text: "Kitchen sink leak under cabinet → check supply line first, then p-trap, then garbage disposal seal.", tags: ["plumbing", "leak", "kitchen"] },
  { id: "kb_002", text: "Front door key won't turn → lubricate cylinder + bump-key check before drilling.", tags: ["locksmith", "lockout"] },
  { id: "kb_003", text: "No hot water on gas heater → check pilot light, thermocouple, gas valve in that order.", tags: ["plumbing", "hvac", "water heater"] },
  { id: "kb_004", text: "Circuit breaker tripping repeatedly → identify load, then check GFCI outlets in kitchens and bathrooms first.", tags: ["electrical", "breaker"] },
  { id: "kb_005", text: "AC won't cool → thermostat batteries, dirty filter, condenser coil, refrigerant level.", tags: ["hvac", "ac"] },
  { id: "kb_006", text: "Dishwasher won't drain → garbage disposal knockout plug, air gap clog, drain hose kink.", tags: ["appliance", "dishwasher"] },
  { id: "kb_007", text: "Toilet keeps running → flapper seal, fill valve, chain length adjustment.", tags: ["plumbing", "toilet"] },
  { id: "kb_008", text: "Garage door won't close → safety sensor alignment is the most common cause; check LED first.", tags: ["general", "garage"] },
  { id: "kb_009", text: "Smoke detector chirping → 9V battery replacement + check detector age (10yr lifespan).", tags: ["general", "safety"] },
  { id: "kb_010", text: "Low water pressure at single fixture → unscrew and clean aerator before suspecting the supply line.", tags: ["plumbing", "pressure"] },
];

// Past jobs anchored to the real seeded properties in lib/store/seed.ts:
//   prop_1 → 342 Valencia St Unit 3B (owner: Priya Kapoor)
//   prop_2 → 1180 Folsom St Unit PH (owner: Priya Kapoor)
const SEED_PAST_JOBS = [
  { text: "Job j_hist_01 at 342 Valencia St Unit 3B — kitchen sink leak resolved by AcmePlumb on 2026-04-12. Cost $215, on-site within 45min, tenant rated 5★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_1", contractorName: "AcmePlumb", rating: 5 } },
  { text: "Job j_hist_02 at 342 Valencia St Unit 3B — bathroom lockout resolved by SF Quick Locks on 2026-02-03. Cost $145, on-site within 30min, tenant rated 5★.", tags: ["job", "locksmith"], metadata: { propertyId: "prop_1", contractorName: "SF Quick Locks", rating: 5 } },
  { text: "Job j_hist_03 at 342 Valencia St Unit 3B — circuit breaker tripping resolved by Marina Electric on 2026-03-22. Cost $325, tenant rated 4★. Note: faulty appliance was the load.", tags: ["job", "electrical"], metadata: { propertyId: "prop_1", contractorName: "Marina Electric", rating: 4 } },
  { text: "Job j_hist_04 at 342 Valencia St Unit 3B — dishwasher not draining resolved by Mission Appliance Repair on 2026-01-15. Cost $180, tenant rated 5★.", tags: ["job", "appliance"], metadata: { propertyId: "prop_1", contractorName: "Mission Appliance Repair", rating: 5 } },
  { text: "Job j_hist_05 at 1180 Folsom St PH — no hot water resolved by Mission Plumbing & Heating on 2026-04-28. Cost $410, water heater replaced, tenant rated 5★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_2", contractorName: "Mission Plumbing & Heating", rating: 5 } },
  { text: "Job j_hist_06 at 1180 Folsom St PH — AC inoperative resolved by Cool Bay HVAC on 2026-05-02. Cost $285, capacitor replaced, tenant rated 5★.", tags: ["job", "hvac"], metadata: { propertyId: "prop_2", contractorName: "Cool Bay HVAC", rating: 5 } },
  { text: "Job j_hist_07 at 1180 Folsom St PH — running toilet resolved by Bay Drain Pros on 2026-03-08. Cost $95, fill valve replaced, tenant rated 4★.", tags: ["job", "plumbing"], metadata: { propertyId: "prop_2", contractorName: "Bay Drain Pros", rating: 4 } },
  { text: "Job j_hist_08 at 1180 Folsom St PH — bedroom outlet sparking resolved by Hayes Wiring Co on 2026-04-30. Cost $260, tenant rated 5★. Critical safety issue, same-day service.", tags: ["job", "electrical"], metadata: { propertyId: "prop_2", contractorName: "Hayes Wiring Co", rating: 5 } },
];

const SEED_OWNER_PREFS = [
  { text: "Owner Priya Kapoor (342 Valencia St Unit 3B) prefers insured contractors only, no work after 7pm, accepts callbacks via SMS.", tags: ["preference", "owner"], metadata: { propertyId: "prop_1" } },
  { text: "Owner Priya Kapoor (1180 Folsom St PH) requires Cal-licensed contractors for all electrical work, OK with 8am–6pm appointments, prefers same-day quotes when possible.", tags: ["preference", "owner"], metadata: { propertyId: "prop_2" } },
  { text: "Owner Priya Kapoor (342 Valencia St Unit 3B, 1180 Folsom St PH portfolio) authorizes up to $500 without approval; anything higher needs PM sign-off from Alex Rivera.", tags: ["preference", "owner"], metadata: { propertyId: "prop_1" } },
];

export async function seedRetrievalOnce(): Promise<void> {
  if (seeded) return;
  seeded = true;

  // 1. Push contractors into Moss + the in-memory store.
  for (let i = 0; i < SEED_CONTRACTORS.length; i++) {
    const c = SEED_CONTRACTORS[i];
    const contractorId = `ctr_seed_${(i + 1).toString().padStart(3, "0")}`;
    try {
      store.upsertContractor({
        id: contractorId,
        name: c.name,
        phone: c.phone,
        trades: [...c.trades],
        rating: c.rating,
        city: c.city,
        source: "directory",
      });
    } catch (e) {
      console.warn(`[seed-retrieval] upsertContractor failed for ${contractorId}:`, e);
    }
    try {
      await moss.indexContractor({
        contractorId,
        name: c.name,
        trades: [...c.trades],
        city: c.city,
        specialties: [...c.specialties],
        rating: c.rating,
      });
    } catch (e) {
      console.warn(`[seed-retrieval] moss.indexContractor failed for ${contractorId}:`, e);
    }
  }

  // 2. Knowledge index.
  for (const k of SEED_KNOWLEDGE) {
    try {
      await moss.indexKnowledge(k);
    } catch (e) {
      console.warn(`[seed-retrieval] moss.indexKnowledge failed for ${k.id}:`, e);
    }
  }

  // 3. Supermemory historical jobs + owner preferences.
  for (const m of [...SEED_PAST_JOBS, ...SEED_OWNER_PREFS]) {
    try {
      await supermemory.remember({ text: m.text, tags: m.tags, metadata: m.metadata });
    } catch (e) {
      console.warn(`[seed-retrieval] supermemory.remember failed:`, e);
    }
  }
}
