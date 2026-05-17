import { store } from "@/lib/store/memory";
import type { Job, Person, Property, Unit } from "@/lib/types";

/**
 * The agent-facing view of a *building* (Property). Multi-tenant buildings
 * have many `Unit`s; each unit has its own tenants, lockbox, and layout.
 *
 * The triage agent uses this to confirm caller identity ("I have you as
 * Marcus at Unit 3B, 342 Valencia — is that right?") without making the
 * tenant re-spell anything.
 *
 * Keep this shape stable — the dashboard page and agent prompt both consume it.
 */
export interface PropertyContext {
  property: Property;
  manager?: Person;
  owner?: Person;
  units: UnitContext[];
  recentJobs: Job[];
  lifetimeJobCount: number;
  lifetimeSpendCents: number;
  occupancy: { totalUnits: number; occupiedUnits: number };
  preferredContractors: { id: string; name: string; trades: string[]; lastUsedAt: string }[];
}

export interface UnitContext {
  unit: Unit;
  tenants: Person[];
  recentJobIds: string[];
  /** Effective spend cap: unit override or building default. */
  effectiveSpendCapCents?: number;
}

const ACTIVE_STATUSES = new Set<Job["status"]>([
  "triaging",
  "sourcing_contractor",
  "scheduled",
  "in_progress",
  "awaiting_survey",
  "awaiting_payment",
  "payment_authorized",
]);

export function getPropertyContext(id: string): PropertyContext | null {
  const property = store.properties.get(id);
  if (!property) return null;

  const manager = store.people.get(property.managerId);
  const owner = store.people.get(property.ownerId);

  const units = store.listUnitsForProperty(id);
  const allJobs = store.listJobs().filter((j) => j.propertyId === id);

  const unitContexts: UnitContext[] = units.map((u) => {
    const tenants = u.tenantIds
      .map((tid) => store.people.get(tid))
      .filter((p): p is Person => Boolean(p));
    const recentJobIds = allJobs
      .filter((j) => j.title?.toLowerCase().includes(u.label.toLowerCase()))
      .slice(0, 5)
      .map((j) => j.id);
    return {
      unit: u,
      tenants,
      recentJobIds,
      effectiveSpendCapCents: u.spendCapCents ?? property.spendCapCents,
    };
  });

  const recentJobs = allJobs.slice(0, 8);
  const lifetimeSpendCents = allJobs
    .filter((j) => j.status === "paid" || j.status === "completed")
    .reduce((sum, j) => sum + (j.totalCostCents ?? 0), 0);

  const contractorLastUsed = new Map<string, string>();
  for (const j of allJobs) {
    if (!j.assignedContractorId) continue;
    const cur = contractorLastUsed.get(j.assignedContractorId);
    if (!cur || j.updatedAt > cur) {
      contractorLastUsed.set(j.assignedContractorId, j.updatedAt);
    }
  }
  const preferredContractors = Array.from(contractorLastUsed.entries())
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([cid, lastUsedAt]) => {
      const c = store.contractors.get(cid);
      if (!c) return null;
      return { id: c.id, name: c.name, trades: c.trades, lastUsedAt };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const occupiedUnits = unitContexts.filter((u) => u.tenants.length > 0).length;

  return {
    property,
    manager,
    owner,
    units: unitContexts,
    recentJobs,
    lifetimeJobCount: allJobs.length,
    lifetimeSpendCents,
    occupancy: { totalUnits: unitContexts.length, occupiedUnits },
    preferredContractors,
  };
}

/**
 * The triage agent calls this when an inbound call's caller-ID matches a tenant.
 * Returns the building, the specific unit they live in, and the tenant record —
 * so the agent can confirm identity in one breath.
 */
export function getPropertyContextByCallerPhone(
  phone: string,
): { context: PropertyContext; unit?: UnitContext; tenant: Person } | null {
  const normalized = phone.replace(/\D/g, "");
  for (const person of store.people.values()) {
    if (person.role !== "tenant") continue;
    if (person.phone.replace(/\D/g, "") !== normalized) continue;
    if (!person.propertyId) continue;
    const context = getPropertyContext(person.propertyId);
    if (!context) continue;
    const unit = person.unitId
      ? context.units.find((u) => u.unit.id === person.unitId)
      : undefined;
    return { context, unit, tenant: person };
  }
  return null;
}

/** Compact human-readable summary the agent can paste into its system prompt. */
export function summarizePropertyForAgent(
  ctx: PropertyContext,
  unit?: UnitContext,
): string {
  const { property: p, owner, lifetimeSpendCents, preferredContractors } = ctx;
  const lines: string[] = [];
  lines.push(`Building: ${p.address}`);
  if (p.propertyType) lines.push(`Type: ${p.propertyType.replace(/_/g, " ")}`);
  if (owner) lines.push(`Owner: ${owner.name}`);
  if (ctx.occupancy.totalUnits) {
    lines.push(
      `Occupancy: ${ctx.occupancy.occupiedUnits}/${ctx.occupancy.totalUnits} units occupied`,
    );
  }

  if (unit) {
    const u = unit.unit;
    lines.push(`---`);
    lines.push(`Unit: ${u.label}${u.floor ? ` (floor ${u.floor})` : ""}`);
    if (u.bedrooms || u.bathrooms) {
      lines.push(
        `Layout: ${u.bedrooms ?? "?"}bd / ${u.bathrooms ?? "?"}ba${u.sqft ? ` · ${u.sqft} sqft` : ""}`,
      );
    }
    if (unit.tenants.length) {
      lines.push(`Tenants in unit: ${unit.tenants.map((t) => t.name).join(", ")}`);
    }
    if (u.lockboxCode) lines.push(`Unit lockbox: ${u.lockboxCode}`);
    if (unit.effectiveSpendCapCents) {
      lines.push(
        `Spend cap (no approval needed): $${(unit.effectiveSpendCapCents / 100).toFixed(0)}`,
      );
    }
    if (u.notes) lines.push(`Unit notes: ${u.notes}`);
  } else if (ctx.units.length > 0) {
    lines.push(`---`);
    lines.push(`Units: ${ctx.units.map((u) => u.unit.label).join(", ")}`);
  }

  // Building-wide
  if (p.ownerInstructions) lines.push(`Owner rules: ${p.ownerInstructions}`);
  const access = [
    p.gateCode && `Gate ${p.gateCode}`,
    p.lockboxCode && `Building lockbox ${p.lockboxCode}`,
    p.parkingNotes,
    p.accessNotes,
  ]
    .filter(Boolean)
    .join(" · ");
  if (access) lines.push(`Access: ${access}`);
  if (p.waterShutoffLocation) lines.push(`Water shutoff: ${p.waterShutoffLocation}`);
  if (p.electricalPanelLocation) lines.push(`Breaker panel: ${p.electricalPanelLocation}`);
  if (p.hvacType) lines.push(`HVAC: ${p.hvacType}`);
  if (p.notes) lines.push(`Building notes: ${p.notes}`);
  if (preferredContractors.length) {
    lines.push(
      `Recent contractors: ${preferredContractors
        .slice(0, 3)
        .map((c) => `${c.name} (${c.trades.join("/")})`)
        .join(", ")}`,
    );
  }
  lines.push(
    `History: ${ctx.lifetimeJobCount} job(s), $${(lifetimeSpendCents / 100).toFixed(2)} lifetime`,
  );
  return lines.join("\n");
}
