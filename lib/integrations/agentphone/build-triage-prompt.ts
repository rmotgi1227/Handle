import { store } from "@/lib/store/memory";
import { TRIAGE_AGENT_SYSTEM_PROMPT } from "./system-prompt";

/**
 * Generates the full system prompt the AgentPhone triage agent runs with.
 *
 * We append a structured "Tenant directory" appendix listing every tenant in
 * the store, their unit, their building, owner spend cap, and a few quirks
 * the agent might need on the call. Because AgentPhone hosted agents read
 * the system prompt as ground truth, this is how "the agent pulls from the
 * tenant database" — the database is literally baked into the prompt every
 * time we run `syncTriagePrompt()`.
 */
export function buildTriagePrompt(): string {
  const tenants = Array.from(store.people.values()).filter((p) => p.role === "tenant");

  const lines: string[] = [];
  lines.push("");
  lines.push("---");
  lines.push("## Tenant directory (your database — refresh on every prompt sync)");
  lines.push("");
  lines.push(
    "When the call connects, check the From number against this directory. If it matches a tenant below, you ALREADY know who they are and what building/unit they live in. Don't make them spell their address — confirm what you have. Example:",
  );
  lines.push("");
  lines.push(
    '  "Hi, is this Marcus? I have you in unit three-B at three forty-two Valencia — is that right?"',
  );
  lines.push("");
  lines.push(
    "If they confirm, skip the address/unit questions and go straight to what's wrong. If they correct you (different unit, different building, sub-letter, etc.), trust them and use what they say.",
  );
  lines.push("");
  lines.push(
    "If the From number is NOT in this directory, treat the caller as new and collect everything from scratch.",
  );
  lines.push("");

  if (tenants.length === 0) {
    lines.push("(no tenants on file)");
  } else {
    for (const t of tenants) {
      const property = t.propertyId ? store.properties.get(t.propertyId) : undefined;
      const unit = t.unitId ? store.getUnit(t.unitId) : undefined;
      const address = property
        ? `${property.address}${unit?.label ? `, Unit ${unit.label}` : ""}`
        : "(no property)";
      const access: string[] = [];
      if (property?.gateCode) access.push(`gate ${property.gateCode}`);
      if (unit?.lockboxCode) access.push(`unit lockbox ${unit.lockboxCode}`);
      else if (property?.lockboxCode) access.push(`building lockbox ${property.lockboxCode}`);
      const spendCap = unit?.spendCapCents ?? property?.spendCapCents;
      const facts: string[] = [];
      if (unit?.bedrooms || unit?.bathrooms) {
        facts.push(`${unit.bedrooms ?? "?"}bd/${unit.bathrooms ?? "?"}ba`);
      }
      if (unit?.notes) facts.push(`unit notes: ${unit.notes}`);
      if (property?.notes) facts.push(`building notes: ${property.notes}`);
      if (property?.ownerInstructions) facts.push(`owner rule: ${property.ownerInstructions}`);
      if (property?.waterShutoffLocation) facts.push(`water shutoff: ${property.waterShutoffLocation}`);
      if (property?.hvacType) facts.push(`hvac: ${property.hvacType}`);

      lines.push(
        `- From ${t.phone} → ${t.name} at ${address}` +
          (access.length ? ` · access: ${access.join(", ")}` : "") +
          (spendCap ? ` · spend cap $${Math.round(spendCap / 100)}` : "") +
          (facts.length ? `\n    (${facts.join(" | ")})` : ""),
      );
    }
  }

  lines.push("");
  lines.push("---");
  lines.push(
    "## Why this matters",
    "Tenants who feel recognized trust you instantly. The directory above is the source of truth — never invent unit numbers, lockbox codes, or owner rules. If a tenant tells you something that contradicts the directory, believe them and continue (we'll fix our records after).",
  );

  return TRIAGE_AGENT_SYSTEM_PROMPT + "\n\n" + lines.join("\n");
}
