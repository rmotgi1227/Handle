import type { Trade } from "@/lib/types";
import type { BrowserUseClient } from "./index";

/**
 * Deterministic contractor fixtures per trade. Same input → same output.
 */

type Candidate = {
  name: string;
  phone: string;
  rating?: number;
  url?: string;
};

const FIXTURES: Record<Trade, Candidate[]> = {
  plumbing: [
    { name: "Mission Plumbing Co.", phone: "+14155550111", rating: 4.8, url: "https://example.com/mission-plumbing" },
    { name: "Bay Area Drain Pros", phone: "+14155550112", rating: 4.6, url: "https://example.com/bay-area-drain" },
    { name: "Golden Gate Pipefitters", phone: "+14155550113", rating: 4.7, url: "https://example.com/gg-pipefitters" },
    { name: "Sunset Sink Service", phone: "+14155550114", rating: 4.4, url: "https://example.com/sunset-sink" },
  ],
  electrical: [
    { name: "Volt Brothers Electric", phone: "+14155550121", rating: 4.9, url: "https://example.com/volt-bros" },
    { name: "Castro Wire Works", phone: "+14155550122", rating: 4.7, url: "https://example.com/castro-wire" },
    { name: "Pacific Power Tech", phone: "+14155550123", rating: 4.5, url: "https://example.com/pacific-power" },
  ],
  hvac: [
    { name: "Cool Bay HVAC", phone: "+14155550131", rating: 4.6, url: "https://example.com/cool-bay" },
    { name: "Climate Right SF", phone: "+14155550132", rating: 4.8, url: "https://example.com/climate-right" },
    { name: "Mission Mechanical", phone: "+14155550133", rating: 4.4, url: "https://example.com/mission-mech" },
  ],
  appliance: [
    { name: "SF Appliance Repair", phone: "+14155550141", rating: 4.5, url: "https://example.com/sf-appliance" },
    { name: "Marina Fix-It", phone: "+14155550142", rating: 4.7, url: "https://example.com/marina-fixit" },
    { name: "Sunset Service Co.", phone: "+14155550143", rating: 4.3, url: "https://example.com/sunset-service" },
  ],
  locksmith: [
    { name: "24/7 Lock & Key", phone: "+14155550151", rating: 4.9, url: "https://example.com/247-lock" },
    { name: "Bay Bridge Locksmith", phone: "+14155550152", rating: 4.6, url: "https://example.com/bay-bridge-lock" },
    { name: "Pacific Heights Keys", phone: "+14155550153", rating: 4.5, url: "https://example.com/ph-keys" },
  ],
  pest_control: [
    { name: "EcoPest SF", phone: "+14155550161", rating: 4.6, url: "https://example.com/ecopest" },
    { name: "Bay Area Pest Pros", phone: "+14155550162", rating: 4.4, url: "https://example.com/bap-pros" },
    { name: "Sunset Exterminators", phone: "+14155550163", rating: 4.5, url: "https://example.com/sunset-ext" },
  ],
  cleaning: [
    { name: "Sparkle Clean SF", phone: "+14155550171", rating: 4.8, url: "https://example.com/sparkle" },
    { name: "Mission Maid Service", phone: "+14155550172", rating: 4.7, url: "https://example.com/mission-maid" },
    { name: "Bay Cleaning Co.", phone: "+14155550173", rating: 4.5, url: "https://example.com/bay-cleaning" },
  ],
  roofing: [
    { name: "Skyline Roofing", phone: "+14155550181", rating: 4.7, url: "https://example.com/skyline-roof" },
    { name: "Pacific Roof & Gutter", phone: "+14155550182", rating: 4.6, url: "https://example.com/pacific-roof" },
    { name: "Bay Top Roofers", phone: "+14155550183", rating: 4.4, url: "https://example.com/bay-top" },
  ],
  landscaping: [
    { name: "Green Thumb SF", phone: "+14155550191", rating: 4.6, url: "https://example.com/green-thumb" },
    { name: "Mission Landscapes", phone: "+14155550192", rating: 4.5, url: "https://example.com/mission-land" },
    { name: "Bay Yard Co.", phone: "+14155550193", rating: 4.3, url: "https://example.com/bay-yard" },
  ],
  general: [
    { name: "All-Trades Handy SF", phone: "+14155550101", rating: 4.5, url: "https://example.com/all-trades" },
    { name: "Bay Handy Pros", phone: "+14155550102", rating: 4.4, url: "https://example.com/bay-handy" },
    { name: "Mission Maintenance", phone: "+14155550103", rating: 4.6, url: "https://example.com/mission-maint" },
  ],
};

export const browseruse: BrowserUseClient = {
  async findContractors({ trade, limit }) {
    const pool = FIXTURES[trade] ?? FIXTURES.general;
    const max = Math.max(1, Math.min(limit ?? 5, pool.length));
    return { candidates: pool.slice(0, max) };
  },
};
