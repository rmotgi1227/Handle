import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";

export async function GET(): Promise<Response> {
  const jobs = store.listJobs();
  // Build a per-job "negotiated deal" snippet from the most recent accepted
  // outbound contractor call. Drives the ETA chip on the job list.
  const dealByJob = new Map<
    string,
    { quotedPriceCents?: number; etaWindow?: string; endedAt: string }
  >();
  for (const call of store.contractorCalls.values()) {
    if (call.outcome !== "accepted_job") continue;
    const endedAt = call.endedAt ?? call.startedAt;
    const existing = dealByJob.get(call.jobId);
    if (!existing || endedAt > existing.endedAt) {
      dealByJob.set(call.jobId, {
        quotedPriceCents: call.quotedPriceCents,
        etaWindow: call.etaWindow,
        endedAt,
      });
    }
  }
  const enriched = jobs.map((j) => {
    const deal = dealByJob.get(j.id);
    return {
      ...j,
      negotiatedDeal: deal
        ? { quotedPriceCents: deal.quotedPriceCents, etaWindow: deal.etaWindow }
        : undefined,
    };
  });
  return Response.json({ jobs: enriched });
}
