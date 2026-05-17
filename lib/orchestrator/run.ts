import { nanoid } from "nanoid";
import { store } from "@/lib/store/memory";
import { agentphone } from "@/lib/integrations/agentphone";
import { gemini } from "@/lib/integrations/gemini";
import { supermemory } from "@/lib/integrations/supermemory";
import { browseruse } from "@/lib/integrations/browseruse";
import { moss } from "@/lib/integrations/moss";
import type {
  Contractor,
  ContractorCallOutcome,
  Trade,
} from "@/lib/types";

export interface RecallContext {
  pastJobs: { id: string; text: string; score: number }[];
  ownerPreferences: { id: string; text: string; score: number }[];
  contractorHits: { contractorId: string; score: number }[];
  knowledgeHits: { id: string; text: string; score: number }[];
}

interface BuildRecallContextInput {
  trade: Trade;
  city: string;
  problem: string;
  address: string | undefined;
}

async function buildRecallContext(input: BuildRecallContextInput): Promise<RecallContext> {
  const recallQuery = `${input.address ?? "unknown"} ${input.trade}`;
  const knowledgeQuery = `${input.trade} ${input.problem}`;

  const [knowledgeRes, contractorRes, memoryRes] = await Promise.all([
    moss.searchKnowledge({ query: knowledgeQuery, topK: 3 }).catch((e) => {
      console.warn("[orchestrator] moss.searchKnowledge failed:", e);
      return { hits: [] as { id: string; text: string; score: number }[] };
    }),
    moss
      .searchContractors({
        trade: input.trade,
        city: input.city,
        problem: input.problem,
        topK: 5,
      })
      .catch((e) => {
        console.warn("[orchestrator] moss.searchContractors failed:", e);
        return { hits: [] as { contractorId: string; score: number }[] };
      }),
    supermemory.recall({ query: recallQuery, topK: 6 }).catch((e) => {
      console.warn("[orchestrator] supermemory.recall failed:", e);
      return { memories: [] as { id: string; text: string; score: number }[] };
    }),
  ]);

  // Owner prefs and past jobs come from the same Supermemory pool; split by tag-ish heuristics.
  const owner: RecallContext["ownerPreferences"] = [];
  const past: RecallContext["pastJobs"] = [];
  for (const m of memoryRes.memories) {
    if (/owner|prefer|portfolio|authoriz/i.test(m.text)) owner.push(m);
    else past.push(m);
  }

  return {
    pastJobs: past,
    ownerPreferences: owner,
    contractorHits: contractorRes.hits,
    knowledgeHits: knowledgeRes.hits,
  };
}

/**
 * Deterministic djb2-style hash → integer.
 */
function djb2(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  // Force unsigned 32-bit
  return hash >>> 0;
}

/**
 * Map a contractorId to a deterministic dial outcome bucket.
 * 0-6 → accepted_job, 7-8 → callback_scheduled, 9 → no_answer.
 */
export function simulateDialOutcome(contractorId: string): ContractorCallOutcome {
  const bucket = djb2(contractorId) % 10;
  if (bucket <= 6) return "accepted_job";
  if (bucket <= 8) return "callback_scheduled";
  return "no_answer";
}

/**
 * Deterministic ETA window for accepted jobs (per contractor).
 */
function simulateEtaWindow(contractorId: string): string {
  const minutes = 20 + (djb2(contractorId) % 60); // 20–79 min
  return `${minutes}–${minutes + 30} min`;
}

// ---------------------------------------------------------------------------
// findContractorsForJob — used by /api/contractors/find and orchestrator
// ---------------------------------------------------------------------------

export interface FindContractorsInput {
  jobId: string;
  trade: Trade;
  city: string;
  mossHits?: { contractorId: string; score: number }[];
}

export interface FindContractorsResult {
  contractorIds: string[];
}

export async function findContractorsForJob(
  input: FindContractorsInput,
): Promise<FindContractorsResult> {
  const { jobId, trade, city, mossHits } = input;

  // Moss-first path: if we already have ≥3 ranked hits, use them directly.
  if (mossHits && mossHits.length >= 3) {
    const sorted = [...mossHits].sort((a, b) => b.score - a.score).slice(0, 5);
    const contractorIds = sorted
      .map((h) => h.contractorId)
      .filter((id) => store.contractors.has(id));

    store.appendEvent({
      jobId,
      kind: "contractor_search_completed",
      title: `Found ${contractorIds.length} candidates from Moss`,
      data: { contractorIds, source: "moss" },
    });

    return { contractorIds };
  }

  // Fallback: Browser Use sourcing (existing behavior, unchanged).
  const { candidates } = await browseruse.findContractors({
    trade,
    city,
    limit: 5,
  });

  const existing = store.listContractors();
  const byPhone = new Map<string, Contractor>();
  for (const c of existing) byPhone.set(c.phone, c);

  for (const cand of candidates) {
    if (byPhone.has(cand.phone)) continue;
    const created = store.upsertContractor({
      id: `ctr_${nanoid(8)}`,
      name: cand.name,
      phone: cand.phone,
      trades: [trade],
      rating: cand.rating,
      city,
      source: "browser_use",
    });
    byPhone.set(created.phone, created);
  }

  // Choose contractors who can service this trade, scoped to the city when possible.
  const all = store.listContractors().filter((c) => c.trades.includes(trade));
  const cityMatches = all.filter((c) => !c.city || c.city === city);
  const pool = cityMatches.length > 0 ? cityMatches : all;
  const ranked = pool
    .slice()
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);
  const contractorIds = ranked.map((c) => c.id);

  store.appendEvent({
    jobId,
    kind: "contractor_search_completed",
    title: `Found ${contractorIds.length} candidates`,
    data: { contractorIds, source: "browser_use" },
  });

  return { contractorIds };
}

// ---------------------------------------------------------------------------
// dialContractorForJob — used by /api/contractors/dial and orchestrator
// ---------------------------------------------------------------------------

export interface DialContractorInput {
  jobId: string;
  contractorId: string;
}

export interface DialContractorResult {
  outcome: ContractorCallOutcome;
  contractorCallId: string;
  etaWindow?: string;
}

export async function dialContractorForJob(
  input: DialContractorInput,
): Promise<DialContractorResult> {
  const { jobId, contractorId } = input;

  const job = store.getJob(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);
  const contractor = store.contractors.get(contractorId);
  if (!contractor) throw new Error(`Contractor not found: ${contractorId}`);
  const property = store.properties.get(job.propertyId);
  const propertyAddress = property
    ? `${property.address}${property.unit ? ` Unit ${property.unit}` : ""}`
    : "(address unknown)";

  const { script } = await gemini.draftContractorScript({
    jobTitle: job.title,
    jobDescription: job.description,
    propertyAddress,
    urgency: job.urgency,
  });

  const { callId: contractorCallId } = await agentphone.placeOutboundCall({
    toNumber: contractor.phone,
    script,
    metadata: { jobId, contractorId },
  });

  store.appendEvent({
    jobId,
    kind: "contractor_dial_started",
    title: `Dialing ${contractor.name}`,
    data: { contractorId, contractorCallId },
  });

  const outcome = simulateDialOutcome(contractorId);
  const etaWindow = outcome === "accepted_job" ? simulateEtaWindow(contractorId) : undefined;

  store.contractorCalls.set(contractorCallId, {
    id: contractorCallId,
    jobId,
    contractorId,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    outcome,
    etaWindow,
  });

  store.appendEvent({
    jobId,
    kind: "contractor_dial_outcome",
    title: `${contractor.name}: ${outcome.replace(/_/g, " ")}`,
    detail: etaWindow ? `ETA ${etaWindow}` : undefined,
    data: { contractorId, contractorCallId, outcome, etaWindow },
  });

  return { outcome, contractorCallId, etaWindow };
}

// ---------------------------------------------------------------------------
// runAgent — main orchestrator loop
// ---------------------------------------------------------------------------

export interface RunAgentInput {
  callId: string;
}

export interface RunAgentResult {
  jobId: string;
  contractorId: string | null;
}

export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const { callId } = input;

  const call = store.calls.get(callId);
  if (!call) throw new Error(`Call not found: ${callId}`);

  // 1. Pull transcript (live + persisted) and merge.
  let transcriptLines = call.transcript;
  try {
    const fresh = await agentphone.fetchTranscript(callId);
    if (fresh.length > transcriptLines.length) {
      transcriptLines = fresh;
      store.upsertCall({ ...call, transcript: fresh });
    }
  } catch {
    // Best effort — fall back to persisted transcript.
  }
  const transcriptText = transcriptLines.map((l) => `${l.speaker}: ${l.text}`).join("\n");

  // 2. Classify intent with Gemini.
  const intent = await gemini.classifyIntent({ transcript: transcriptText });

  // 3. Resolve property/reporter from the call.
  const property = call.propertyId ? store.properties.get(call.propertyId) : undefined;
  const reporter = call.callerId ? store.people.get(call.callerId) : undefined;
  const propertyId = property?.id ?? "prop_unknown";
  const reporterId = reporter?.id ?? "person_unknown";
  const city = "San Francisco"; // v1: derive from property if extended later.

  // 4. Create or update Job, link to call. The incoming-call route created a
  // stub Job with `status: "triaging"` and put its id on `call.jobId`, so this
  // upsert reuses the existing id and just folds in the classification.
  const job = store.upsertJob({
    id: call.jobId ?? undefined,
    propertyId,
    reportedByPersonId: reporterId,
    status: "sourcing_contractor",
    urgency: intent.urgency,
    trade: intent.trade,
    title: intent.title,
    description: intent.description,
    callIds: [callId],
  });
  store.upsertCall({ ...call, jobId: job.id, intent: intent.intent });

  store.appendEvent({
    jobId: job.id,
    kind: "intent_classified",
    title: `Classified as ${intent.trade} · ${intent.urgency}`,
    detail: intent.description,
    data: { intent: intent.intent, confidence: intent.confidence },
  });

  // 5. Recall context — Moss (catalog + knowledge) + Supermemory (history) in parallel.
  const ctx = await buildRecallContext({
    trade: intent.trade,
    city,
    problem: intent.description,
    address: property?.address,
  });

  store.appendEvent({
    jobId: job.id,
    kind: "context_recalled",
    title: `Recalled ${ctx.pastJobs.length} prior jobs · ${ctx.contractorHits.length} contractor matches · ${ctx.ownerPreferences.length} owner prefs`,
    detail:
      [
        ctx.knowledgeHits[0]?.text,
        ctx.pastJobs[0]?.text,
        ctx.ownerPreferences[0]?.text,
      ]
        .filter(Boolean)
        .slice(0, 2)
        .join(" · ") || undefined,
    data: {
      pastJobIds: ctx.pastJobs.map((j) => j.id),
      contractorIds: ctx.contractorHits.map((c) => c.contractorId),
      knowledgeIds: ctx.knowledgeHits.map((k) => k.id),
    },
  });

  // 6. Find contractors — Moss-first; falls back to Browser Use if <3 hits.
  store.appendEvent({
    jobId: job.id,
    kind: "contractor_search_started",
    title: `Searching for ${intent.trade} contractors in ${city}`,
  });
  const { contractorIds } = await findContractorsForJob({
    jobId: job.id,
    trade: intent.trade,
    city,
    mossHits: ctx.contractorHits,
  });

  // 7. Dial top 3 in parallel — first accepted_job WINS the race. The losing
  // dials keep running in the background to fully append their outcome events,
  // but we don't wait for them. In live mode this means a 90-second voicemail
  // never blocks a 3-second accept.
  const top = contractorIds.slice(0, 3);
  type Winner = { contractorId: string; result: DialContractorResult };
  const dialPromises = top.map((contractorId) =>
    dialContractorForJob({ jobId: job.id, contractorId }).then((result) => {
      if (result.outcome !== "accepted_job") {
        throw new Error("not_accepted"); // makes Promise.any skip
      }
      return { contractorId, result } satisfies Winner;
    }),
  );

  let winner: Winner | null = null;
  try {
    winner = await Promise.any(dialPromises);
  } catch {
    // All three failed to accept — leave winner null.
  }

  let assignedContractorId: string | null = null;
  if (winner) {
    assignedContractorId = winner.contractorId;
    store.upsertJob({
      id: job.id,
      assignedContractorId,
      status: "scheduled",
      scheduledFor: winner.result.etaWindow,
    });
    const contractor = store.contractors.get(assignedContractorId);
    store.appendEvent({
      jobId: job.id,
      kind: "contractor_assigned",
      title: `Assigned ${contractor?.name ?? assignedContractorId}`,
      detail: winner.result.etaWindow ? `ETA ${winner.result.etaWindow}` : undefined,
      data: { contractorId: assignedContractorId, etaWindow: winner.result.etaWindow },
    });

    // 10. Remember in Supermemory — richer text/tags improves future recall.
    try {
      const etaSuffix = winner.result.etaWindow ? `, eta ${winner.result.etaWindow}` : "";
      await supermemory.remember({
        text:
          `Job ${job.id} at ${property?.address ?? propertyId} — ` +
          `${intent.trade} (${intent.urgency}) assigned to ${contractor?.name ?? assignedContractorId}` +
          etaSuffix +
          ".",
        tags: ["job", intent.trade, "assignment"],
        metadata: {
          jobId: job.id,
          contractorId: assignedContractorId,
          propertyId,
          urgency: intent.urgency,
          outcome: "accepted_job",
        },
      });
    } catch (e) {
      console.warn("[orchestrator] supermemory.remember failed:", e);
    }
  }

  return { jobId: job.id, contractorId: assignedContractorId };
}
