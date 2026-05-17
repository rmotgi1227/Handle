import type { JobUrgency, Trade } from "@/lib/types";
import type { GeminiClient } from "./index";

/**
 * Deterministic heuristic classifier. Plain keyword matching on the
 * transcript text — no randomness. Demo-ready.
 */

interface TradeRule {
  trade: Trade;
  keywords: string[];
  intent: string;
  defaultUrgency: JobUrgency;
  title: string;
}

const TRADE_RULES: TradeRule[] = [
  {
    trade: "plumbing",
    keywords: ["leak", "leaking", "water", "drain", "clog", "sink", "toilet", "pipe"],
    intent: "plumbing_issue",
    defaultUrgency: "urgent",
    title: "Plumbing issue reported",
  },
  {
    trade: "electrical",
    keywords: ["no power", "outage", "breaker", "outlet", "spark", "electric"],
    intent: "electrical_issue",
    defaultUrgency: "emergency",
    title: "Electrical issue reported",
  },
  {
    trade: "hvac",
    keywords: ["ac", "a/c", "air conditioning", "heat", "heater", "furnace", "hvac", "no cooling"],
    intent: "hvac_issue",
    defaultUrgency: "urgent",
    title: "HVAC issue reported",
  },
  {
    trade: "locksmith",
    keywords: ["lockout", "locked out", "key", "lock"],
    intent: "lockout",
    defaultUrgency: "emergency",
    title: "Lockout reported",
  },
  {
    trade: "appliance",
    keywords: ["fridge", "refrigerator", "dishwasher", "oven", "stove", "washer", "dryer"],
    intent: "appliance_issue",
    defaultUrgency: "standard",
    title: "Appliance issue reported",
  },
  {
    trade: "pest_control",
    keywords: ["roach", "rat", "mouse", "mice", "pest", "bug", "ants"],
    intent: "pest_issue",
    defaultUrgency: "standard",
    title: "Pest issue reported",
  },
];

const URGENCY_BOOSTERS = ["flood", "flooding", "fire", "smoke", "no power", "emergency", "now", "asap"];
const URGENCY_DAMPENERS = ["whenever", "next week", "no rush", "scheduled"];

function pickRule(text: string): TradeRule {
  const t = text.toLowerCase();
  for (const rule of TRADE_RULES) {
    if (rule.keywords.some((k) => t.includes(k))) return rule;
  }
  return {
    trade: "general",
    keywords: [],
    intent: "general_request",
    defaultUrgency: "standard",
    title: "Maintenance request",
  };
}

function resolveUrgency(text: string, base: JobUrgency): JobUrgency {
  const t = text.toLowerCase();
  if (URGENCY_BOOSTERS.some((k) => t.includes(k))) return "emergency";
  if (URGENCY_DAMPENERS.some((k) => t.includes(k))) return "scheduled";
  return base;
}

function summarizeFirstCallerLine(transcript: string): string {
  // Take the first caller-ish line as a short description.
  const lines = transcript.split(/\r?\n|(?<=\.)\s+/g).map((s) => s.trim()).filter(Boolean);
  const first = lines.find((l) => l.toLowerCase().includes("caller:")) ?? lines[0] ?? transcript;
  return first.replace(/^caller:\s*/i, "").slice(0, 240);
}

export const gemini: GeminiClient = {
  async classifyIntent({ transcript }) {
    const rule = pickRule(transcript);
    const urgency = resolveUrgency(transcript, rule.defaultUrgency);
    const description = summarizeFirstCallerLine(transcript);
    // Confidence is deterministic: 0.9 when a rule matched, 0.5 for general.
    const confidence = rule.trade === "general" ? 0.5 : 0.9;
    return {
      intent: rule.intent,
      trade: rule.trade,
      urgency,
      title: rule.title,
      description,
      confidence,
    };
  },

  async draftContractorScript({ jobTitle, jobDescription, propertyAddress, urgency, recall }) {
    const past = recall?.pastJobs?.[0]?.text;
    const pref = recall?.ownerPreferences?.[0]?.text;
    const lines = [
      `Hi, this is the dispatch agent for the property at ${propertyAddress}.`,
      `We have a ${urgency} job: ${jobTitle}.`,
      `Details: ${jobDescription}.`,
    ];
    if (past) lines.push(`For context: ${past}`);
    if (pref) lines.push(`Heads up: ${pref}`);
    lines.push(`Can you accept this job and give me an ETA window?`);
    return { script: lines.join(" ") };
  },

  async summarizeJob({ events }) {
    if (events.length === 0) {
      return { summary: "No activity yet." };
    }
    const ordered = [...events].sort((a, b) => a.at.localeCompare(b.at));
    const titles = ordered.map((e) => `${e.kind}: ${e.title}`).join(" → ");
    return { summary: `Timeline so far — ${titles}.` };
  },

  async analyzeMedia(_input) {
    return {
      description:
        "Burst copper pipe joint visible under kitchen sink, approximately 2 inches of standing water on cabinet floor, water main shutoff handle visible at left of frame.",
      severity: "emergency" as const,
    };
  },

  async generateVoiceResponse({ userMessage }) {
    if (userMessage.toLowerCase().includes("photo") || userMessage.toLowerCase().includes("picture")) {
      return { text: "Thanks for sending that. I can see the issue clearly now. Let me dispatch the right contractor for you right away." };
    }
    return { text: "I understand. Can you describe what you're seeing, or better yet, text a photo to this number so I can assess the damage accurately?" };
  },
};
