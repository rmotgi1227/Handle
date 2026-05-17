/**
 * Manual sanity check for autonomous contractor calls. Usage:
 *   pnpm exec tsx scripts/test-outbound.ts <e164-number>
 *
 * Example:
 *   pnpm exec tsx scripts/test-outbound.ts +16198974800
 *
 * The agent gets a structured negotiation context — target price, walk-away,
 * competitor anchors, history with this contractor — and is expected to use
 * it actively (anchor with real numbers, push back on high quotes, walk on
 * over-walk-away, accept inside walk-away without re-litigating).
 *
 * Reads env from process.env — run after `set -a && source .env.local && set +a`.
 */
import { agentphone } from "@/lib/integrations/agentphone";
import type { NegotiationContext } from "@/lib/integrations/agentphone";

const to = process.argv[2];
if (!to) {
  console.error("Usage: pnpm exec tsx scripts/test-outbound.ts <e164-number>");
  process.exit(1);
}

const ctx: NegotiationContext = {
  job: {
    trade: "plumbing",
    urgency: "urgent",
    address: "342 Valencia Street",
    unit: "3-B",
    description:
      "Kitchen sink leak under the cabinet — water pooling on the floor, tenant reports it started about an hour ago. Drain trap looks like the likely source per the tenant.",
  },
  pricing: {
    targetCents: 18000, // $180
    walkAwayCents: 24000, // $240
    marketContext:
      "Typical Bay Area emergency plumbing call for a drain-trap leak runs $150 to $220. We've been paying around $180 on average for this exact issue.",
    competitorAnchors: [
      { contractorName: "Mission Plumbing Co.", amountCents: 18500, whenAgo: "last Tuesday" },
      { contractorName: "Bay Drain Pros", amountCents: 17500, whenAgo: "two weeks ago" },
    ],
  },
  contractor: {
    name: "the contractor on this line",
    history:
      "We've dispatched this contractor 6 times in the past 90 days. Average price $195. Reliable — always shows up in the quoted window. Slightly above-market on price, usually negotiates down by $10-20 when asked.",
  },
  timeline:
    "Within the next 2-3 hours ideally. Tenant is home now and the leak is getting worse.",
};

const greeting =
  "Hey — Property Dispatch here. I've got an urgent plumbing job: kitchen sink leak at three-forty-two Valencia, unit three-B. Water's pooling under the cabinet. What's that going to run, and how soon can you be there?";

console.log(`→ dialing ${to}`);
console.log(`  greeting: ${greeting}`);
console.log(`  target: $${(ctx.pricing.targetCents / 100).toFixed(2)}`);
console.log(`  walk-away: $${(ctx.pricing.walkAwayCents / 100).toFixed(2)}`);
console.log(
  `  anchors: ${(ctx.pricing.competitorAnchors ?? [])
    .map((a) => `${a.contractorName} $${(a.amountCents / 100).toFixed(2)} (${a.whenAgo})`)
    .join(", ")}`,
);

agentphone
  .placeOutboundCall({ toNumber: to, script: greeting, negotiationContext: ctx })
  .then((r) => {
    console.log(`✓ placed call: ${r.callId}`);
  })
  .catch((err) => {
    console.error("FAILED:", err);
    process.exit(1);
  });
