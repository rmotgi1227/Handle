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
const AnalyzeMediaSchema = z.object({
  description: z.string().min(1),
  severity: z.enum(["emergency", "urgent", "standard"]),
});

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

async function callMultimodal<T>(
  parts: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0],
  schema: z.ZodType<T>,
  context: string,
): Promise<T> {
  try {
    const model = client().getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });
    const result = await model.generateContent(parts);
    const text = result.response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new IntegrationError("gemini", `${context}: non-JSON output`, cause);
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new IntegrationError("gemini", `${context}: schema validation failed: ${validated.error.message}`);
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

  async draftContractorScript({ jobTitle, jobDescription, propertyAddress, urgency }) {
    const prompt = [
      "Draft a concise outbound dial script for a contractor.",
      "Tone: professional, efficient, friendly. Under 60 seconds when spoken.",
      "Include the property address, urgency, what we need, and ask for ETA.",
      "Respond with ONLY a JSON object: { \"script\": string }.",
      "",
      `Property: ${propertyAddress}`,
      `Urgency: ${urgency}`,
      `Job title: ${jobTitle}`,
      `Job description: ${jobDescription}`,
    ].join("\n");
    return callJson(prompt, ScriptSchema, "draftContractorScript");
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

  async generateVoiceResponse({ systemContext, history, userMessage }) {
    const historyText = history.map(h => `${h.role === "user" ? "Tenant" : "Agent"}: ${h.text}`).join("\n");
    const prompt = [
      systemContext,
      "",
      "Conversation so far:",
      historyText,
      "",
      `Tenant: ${userMessage}`,
      "",
      'Respond as the property management AI agent. Be concise (under 40 words), helpful, and direct. If you have visual context about the issue, use it. Respond with ONLY JSON: { "text": string }',
    ].join("\n");
    return callJson(prompt, z.object({ text: z.string().min(1) }), "generateVoiceResponse");
  },

  async analyzeMedia({ mediaUrl, mimeType }) {
    const res = await fetch(mediaUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new IntegrationError("gemini", `analyzeMedia: failed to fetch media (${res.status})`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > 4_000_000) {
      throw new IntegrationError("gemini", "analyzeMedia: image exceeds 4MB inline data limit");
    }
    const base64 = buffer.toString("base64");
    return callMultimodal(
      [
        { inlineData: { data: base64, mimeType } },
        'Analyze this property maintenance photo. Respond with ONLY a JSON object: { "description": string, "severity": "emergency" | "urgent" | "standard" }. description: specific damage observed, materials affected, safety hazards, estimated severity. severity: emergency = immediate danger or major water/gas/electrical; urgent = significant but not dangerous; standard = minor cosmetic or appliance.',
      ],
      AnalyzeMediaSchema,
      "analyzeMedia",
    );
  },
};
