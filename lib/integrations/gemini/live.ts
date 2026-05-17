import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { IntegrationError } from "@/lib/integrations/adapter";
import { env, requireEnv } from "@/lib/env";
import type { JobUrgency, Trade } from "@/lib/types";
import type { GeminiClient } from "./index";

/**
 * Live Gemini client. Uses the official @google/generative-ai SDK.
 * Requires GEMINI_API_KEY; honors GEMINI_MODEL (defaults from env schema).
 *
 * Boundary validation: every model response is parsed with Zod before the
 * value crosses back into the rest of the app.
 */

const TRADE_VALUES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "locksmith",
  "pest_control",
  "cleaning",
  "general",
  "roofing",
  "landscaping",
] as const satisfies readonly Trade[];

const URGENCY_VALUES = [
  "emergency",
  "urgent",
  "standard",
  "scheduled",
] as const satisfies readonly JobUrgency[];

const ClassifyIntentSchema = z.object({
  intent: z.string().min(1),
  trade: z.enum(TRADE_VALUES),
  urgency: z.enum(URGENCY_VALUES),
  title: z.string().min(1),
  description: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const ScriptSchema = z.object({ script: z.string().min(1) });
const SummarySchema = z.object({ summary: z.string().min(1) });

function client(): GoogleGenerativeAI {
  const key = requireEnv("GEMINI_API_KEY");
  return new GoogleGenerativeAI(key);
}

async function callJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  context: string,
): Promise<T> {
  try {
    const model = client().getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new IntegrationError(
        "gemini",
        `${context}: model returned non-JSON output`,
        cause,
      );
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new IntegrationError(
        "gemini",
        `${context}: response failed schema validation: ${validated.error.message}`,
      );
    }
    return validated.data;
  } catch (err) {
    if (err instanceof IntegrationError) throw err;
    throw new IntegrationError("gemini", `${context} failed`, err);
  }
}

export const gemini: GeminiClient = {
  async classifyIntent({ transcript }) {
    const prompt = [
      "You are a property maintenance triage assistant.",
      "Read the following call transcript and classify the maintenance request.",
      "Respond with ONLY a JSON object matching this schema:",
      `{`,
      `  "intent": string,            // short snake_case intent label`,
      `  "trade": ${TRADE_VALUES.map((v) => `"${v}"`).join(" | ")},`,
      `  "urgency": ${URGENCY_VALUES.map((v) => `"${v}"`).join(" | ")},`,
      `  "title": string,             // 3-7 word headline for the job`,
      `  "description": string,       // 1-2 sentence summary of the issue`,
      `  "confidence": number         // 0..1 confidence in this classification`,
      `}`,
      "",
      "Transcript:",
      transcript,
    ].join("\n");
    return callJson(prompt, ClassifyIntentSchema, "classifyIntent");
  },

  async draftContractorScript({ jobTitle, jobDescription, propertyAddress, urgency, recall }) {
    const recallLines: string[] = [];
    const past = recall?.pastJobs?.[0]?.text;
    const pref = recall?.ownerPreferences?.[0]?.text;
    const know = recall?.knowledgeHits?.[0]?.text;
    if (past) recallLines.push(`- Prior job at this property: "${past}"`);
    if (pref) recallLines.push(`- Owner preference: "${pref}"`);
    if (know) recallLines.push(`- Issue knowledge: "${know}"`);

    const promptLines = [
      "Draft a concise outbound dial script for a contractor.",
      "Tone: professional, efficient, friendly. Under 60 seconds when spoken.",
      "Include the property address, urgency, what we need, and ask for ETA.",
    ];
    if (recallLines.length > 0) {
      promptLines.push(
        "",
        "You MAY reference at most ONE of the following pieces of context — only if it fits naturally and adds value (e.g. continuity, owner constraint, faster diagnosis). Do NOT list them all; pick the most relevant or skip entirely. Never invent details that aren't in this list.",
        ...recallLines,
      );
    }
    promptLines.push(
      "",
      "Respond with ONLY a JSON object: { \"script\": string }.",
      "",
      `Property: ${propertyAddress}`,
      `Urgency: ${urgency}`,
      `Job title: ${jobTitle}`,
      `Job description: ${jobDescription}`,
    );
    return callJson(promptLines.join("\n"), ScriptSchema, "draftContractorScript");
  },

  async summarizeJob({ events }) {
    const prompt = [
      "Summarize the following job-event timeline in 1-2 sentences for a property manager.",
      "Respond with ONLY a JSON object: { \"summary\": string }.",
      "",
      "Events:",
      JSON.stringify(events, null, 2),
    ].join("\n");
    return callJson(prompt, SummarySchema, "summarizeJob");
  },
};
