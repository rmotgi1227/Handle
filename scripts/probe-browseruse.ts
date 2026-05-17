/**
 * One-shot live probe of the Browser Use Cloud API.
 * Usage:  set -a; source .env.local; set +a; pnpm tsx scripts/probe-browseruse.ts
 */
import { browseruse } from "@/lib/integrations/browseruse";

async function main() {
  const start = Date.now();
  console.log("[probe] starting Browser Use findContractors live …");
  const out = await browseruse.findContractors({
    trade: "plumbing",
    city: "San Francisco",
    limit: 5,
  });
  const ms = Date.now() - start;
  console.log(`[probe] complete in ${ms}ms — ${out.candidates.length} candidate(s):`);
  for (const c of out.candidates) {
    console.log(
      `  - ${c.name}  ${c.phone}` +
        (c.rating !== undefined ? `  ★${c.rating}` : "") +
        (c.url ? `  ${c.url}` : ""),
    );
  }
}

main().catch((e) => {
  console.error("[probe] FAILED:", e?.message ?? e);
  if (e?.cause) console.error("[probe] cause:", e.cause);
  process.exit(1);
});
