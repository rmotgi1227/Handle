/**
 * Smoke test for the live Supermemory wiring.
 *
 * Runs a small set of recall queries against the seeded corpus and asserts
 * each one returns at least one result. Designed to catch silent regressions
 * in auth, container-tag scoping, or response shape — things that would
 * otherwise only surface when an inbound call hits a stale agent context.
 *
 * Run: npx tsx --env-file=.env.local scripts/smoke-supermemory.ts
 * Exit codes: 0 = all hits, 1 = some queries returned 0 results, 2 = fatal error.
 */

import { supermemory } from "@/lib/integrations/supermemory";

const PROBES: { query: string; reason: string }[] = [
  { query: "Priya Kapoor owner preferences", reason: "owner-prefs recall" },
  { query: "342 Valencia kitchen sink leak", reason: "past-job recall by address + issue" },
  { query: "tenant contact phone Daniel Park", reason: "tenant-note recall" },
  { query: "annual gutter clean 1655 38th Ave", reason: "recurring-maintenance recall" },
  { query: "AcmePlumb net-15 invoicing terms", reason: "vendor-relationship recall" },
  { query: "elderly grandmother Spanish heat emergency", reason: "cross-field recall (urgency + accessibility)" },
];

type Probe = (typeof PROBES)[number];
type Result = { probe: Probe; hits: number; topScore: number | null; topText: string | null; error?: string };

async function runOne(probe: Probe): Promise<Result> {
  try {
    const { memories } = await supermemory.recall({ query: probe.query, topK: 3 });
    const top = memories[0];
    return {
      probe,
      hits: memories.length,
      topScore: top?.score ?? null,
      topText: top ? top.text.slice(0, 100) : null,
    };
  } catch (err) {
    return {
      probe,
      hits: 0,
      topScore: null,
      topText: null,
      error: (err as Error)?.message ?? String(err),
    };
  }
}

async function main(): Promise<void> {
  console.log(`[smoke-supermemory] running ${PROBES.length} recall probes\n`);
  const results: Result[] = [];
  for (const probe of PROBES) {
    const r = await runOne(probe);
    results.push(r);
    const marker = r.error ? "ERR " : r.hits > 0 ? "OK  " : "MISS";
    const detail = r.error
      ? r.error
      : `${r.hits} hits${r.topScore !== null ? `, top=${r.topScore.toFixed(3)}` : ""}`;
    console.log(`  [${marker}] ${probe.reason}: ${detail}`);
    if (r.topText) console.log(`         ${r.topText}${r.topText.length === 100 ? "…" : ""}`);
  }

  const misses = results.filter((r) => r.hits === 0 && !r.error).length;
  const errs = results.filter((r) => r.error).length;
  console.log(`\n[smoke-supermemory] ${results.length - misses - errs}/${results.length} ok, ${misses} miss, ${errs} err`);

  if (errs > 0) process.exit(2);
  if (misses > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error("[smoke-supermemory] fatal:", err);
  process.exit(2);
});
