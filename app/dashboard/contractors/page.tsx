import "@/lib/store/bootstrap";
import { store } from "@/lib/store/memory";
import { ContractorsView } from "@/components/dashboard/contractors-view";
import type { EnrichedContractor } from "@/components/dashboard/contractor-card";

export default function ContractorsPage() {
  const contractors = store.listContractors();
  const jobs = store.listJobs();

  const enriched: EnrichedContractor[] = contractors.map((c) => {
    const ours = jobs.filter((j) => j.assignedContractorId === c.id);
    const paid = ours.filter((j) => j.status === "paid" || j.status === "completed");
    const lifetimeSpendCents = paid.reduce((sum, j) => sum + (j.totalCostCents ?? 0), 0);
    const lastDispatchedAt = ours
      .map((j) => j.updatedAt)
      .sort()
      .pop();
    const scored = ours
      .map((j) => j.satisfactionScore)
      .filter((s): s is number => typeof s === "number");
    const avgSatisfaction =
      scored.length > 0 ? scored.reduce((a, b) => a + b, 0) / scored.length : undefined;
    return {
      ...c,
      metrics: {
        jobsCompleted: paid.length,
        lifetimeSpendCents,
        lastDispatchedAt,
        avgSatisfaction,
      },
    };
  });

  return <ContractorsView contractors={enriched} />;
}
