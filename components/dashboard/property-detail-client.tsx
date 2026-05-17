"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  KeyRound,
  Wrench,
  ShieldAlert,
  Users,
  Layers,
  Plus,
  Pencil,
  Save,
  X,
  Loader2,
  PhoneCall,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Search,
  Mail,
  ArrowUpDown,
  Building2,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Job, Person, Property, Unit } from "@/lib/types";

type UnitCtx = {
  unit: Unit;
  tenants: Person[];
  recentJobIds: string[];
  effectiveSpendCapCents?: number;
};

type Ctx = {
  property: Property;
  manager?: Person;
  owner?: Person;
  units: UnitCtx[];
  recentJobs: Job[];
  lifetimeJobCount: number;
  lifetimeSpendCents: number;
  occupancy: { totalUnits: number; occupiedUnits: number };
  preferredContractors: { id: string; name: string; trades: string[]; lastUsedAt: string }[];
};

const PROPERTY_TYPES = [
  ["apartment_building", "Apartment building"],
  ["condo_building", "Condo building"],
  ["multi_family", "Multi-family"],
  ["duplex", "Duplex"],
  ["townhouse", "Townhouse"],
  ["single_family", "Single-family home"],
] as const;

function fmtUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function PropertyDetailClient({ initialContext }: { initialContext: Ctx }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx>(initialContext);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Property>>(initialContext.property);
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const propertyId = ctx.property.id;

  async function refetch() {
    const res = await fetch(`/api/properties/${propertyId}`, { cache: "no-store" });
    if (!res.ok) return;
    const fresh = (await res.json()) as Ctx;
    setCtx(fresh);
    setDraft(fresh.property);
    router.refresh();
  }

  function setField<K extends keyof Property>(key: K, value: Property[K] | null) {
    setDraft((d) => ({ ...d, [key]: value as Property[K] }));
  }

  async function saveBuilding() {
    setSaving(true);
    const payload: Record<string, unknown> = {};
    const editable = [
      "address", "propertyType", "yearBuilt",
      "accessNotes", "gateCode", "lockboxCode", "parkingNotes",
      "utilityNotes", "waterShutoffLocation", "electricalPanelLocation", "hvacType",
      "ownerInstructions", "spendCapCents",
      "emergencyContactName", "emergencyContactPhone",
      "notes",
    ] as const;
    for (const k of editable) {
      const v = (draft as Record<string, unknown>)[k];
      if (v === "" || v === undefined) {
        payload[k] = null;
      } else {
        payload[k] = v;
      }
    }
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await refetch();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = useMemo(
    () =>
      PROPERTY_TYPES.find(([k]) => k === ctx.property.propertyType)?.[1] ?? "Building",
    [ctx.property.propertyType],
  );

  // Flat tenant rows (Tenant DB is the hero of this page).
  const tenantRows: TenantRow[] = useMemo(() => {
    const rows: TenantRow[] = [];
    for (const u of ctx.units) {
      for (const t of u.tenants) {
        rows.push({
          person: t,
          unitLabel: u.unit.label,
          unitId: u.unit.id,
          floor: u.unit.floor,
          sqft: u.unit.sqft,
          spendCapCents: u.effectiveSpendCapCents,
          jobCount: u.recentJobIds.length,
          ownership: u.ownership,
        });
      }
    }
    return rows;
  }, [ctx.units]);

  return (
    <div className="flex flex-col gap-6">
      {/* COMPACT HEADER */}
      <header
        className="rounded-2xl border border-[#E8E3DA] bg-white p-5 sm:p-6"
        style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">
              <Building2 className="size-3" />
              {typeLabel}
            </div>
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-[#15161A] sm:text-4xl">
              {ctx.property.address}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#6B7070]">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" /> {tenantRows.length} tenants
              </span>
              <span className="text-[#E8E3DA]">·</span>
              <span>
                {ctx.occupancy.occupiedUnits}/{ctx.occupancy.totalUnits}{" "}
                <span className="font-medium text-[#9AA0A0]">units occupied</span>
              </span>
              <span className="text-[#E8E3DA]">·</span>
              <span>
                {ctx.lifetimeJobCount}{" "}
                <span className="font-medium text-[#9AA0A0]">lifetime jobs</span>
              </span>
              <span className="text-[#E8E3DA]">·</span>
              <span className="font-mono tabular-nums">
                {fmtUsd(ctx.lifetimeSpendCents)}{" "}
                <span className="font-medium text-[#9AA0A0]">spend</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAddUnitOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E3DA] bg-white px-3.5 py-2 text-xs font-bold text-[#15161A] hover:bg-[#F6F4EF]"
            >
              <Layers className="size-3" /> Add unit
            </button>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(ctx.property);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E3DA] bg-white px-3.5 py-2 text-xs font-bold text-[#6B7070] hover:bg-[#F6F4EF]"
                >
                  <X className="size-3" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={saveBuilding}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#15161A] px-4 py-2 text-xs font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Save building
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E3DA] bg-white px-3.5 py-2 text-xs font-bold text-[#15161A] hover:bg-[#EEEBE4]"
              >
                <Pencil className="size-3" /> Edit building
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN GRID — Tenant table is the hero; building info is the sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex flex-col gap-6">
          <TenantTable
            rows={tenantRows}
            occupiedUnits={ctx.occupancy.occupiedUnits}
            totalUnits={ctx.occupancy.totalUnits}
          />

        </main>

        {/* SIDEBAR — building info, collapsible */}
        <aside className="flex flex-col gap-3">
          <SidebarAccordion title="Owner & manager" icon={<Users className="size-3.5" />} defaultOpen>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-baseline justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">Manager</span>
                <span className="font-semibold text-[#15161A]">{ctx.manager?.name ?? "—"}</span>
              </li>
              <li className="flex items-baseline justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">Owner</span>
                <span className="font-semibold text-[#15161A]">{ctx.owner?.name ?? "—"}</span>
              </li>
            </ul>
          </SidebarAccordion>

          <SidebarAccordion title="Identity" icon={<MapPin className="size-3.5" />}>
            <Grid>
              <Field label="Street address" editing={editing} value={editing ? (draft.address ?? "") : ctx.property.address} onChange={(v) => setField("address", v)} />
              <SelectField
                label="Type"
                editing={editing}
                value={(editing ? draft.propertyType : ctx.property.propertyType) ?? ""}
                options={PROPERTY_TYPES as unknown as readonly (readonly [string, string])[]}
                onChange={(v) => setField("propertyType", (v || null) as Property["propertyType"])}
              />
              <NumField
                label="Year built"
                editing={editing}
                value={(editing ? draft.yearBuilt : ctx.property.yearBuilt) ?? null}
                onChange={(v) => setField("yearBuilt", v)}
              />
            </Grid>
          </SidebarAccordion>

          <SidebarAccordion title="Building access" icon={<KeyRound className="size-3.5" />}>
            <Grid>
              <Field label="Main gate code" editing={editing} mono value={editing ? (draft.gateCode ?? "") : ctx.property.gateCode ?? "—"} onChange={(v) => setField("gateCode", v)} />
              <Field label="Lobby / building lockbox" editing={editing} mono value={editing ? (draft.lockboxCode ?? "") : ctx.property.lockboxCode ?? "—"} onChange={(v) => setField("lockboxCode", v)} />
            </Grid>
            <Multi label="Parking" editing={editing} value={editing ? (draft.parkingNotes ?? "") : ctx.property.parkingNotes ?? ""} onChange={(v) => setField("parkingNotes", v)} />
            <Multi label="Access notes" editing={editing} value={editing ? (draft.accessNotes ?? "") : ctx.property.accessNotes ?? ""} onChange={(v) => setField("accessNotes", v)} />
          </SidebarAccordion>

          <SidebarAccordion title="Building utilities" icon={<Wrench className="size-3.5" />}>
            <Grid>
              <Field label="Water shutoff" editing={editing} value={editing ? (draft.waterShutoffLocation ?? "") : ctx.property.waterShutoffLocation ?? "—"} onChange={(v) => setField("waterShutoffLocation", v)} />
              <Field label="Main breaker panel" editing={editing} value={editing ? (draft.electricalPanelLocation ?? "") : ctx.property.electricalPanelLocation ?? "—"} onChange={(v) => setField("electricalPanelLocation", v)} />
              <Field label="HVAC" editing={editing} value={editing ? (draft.hvacType ?? "") : ctx.property.hvacType ?? "—"} onChange={(v) => setField("hvacType", v)} />
            </Grid>
            <Multi label="Utility notes" editing={editing} value={editing ? (draft.utilityNotes ?? "") : ctx.property.utilityNotes ?? ""} onChange={(v) => setField("utilityNotes", v)} />
          </SidebarAccordion>

          <SidebarAccordion title="Owner rules" icon={<ShieldAlert className="size-3.5" />}>
            <Grid>
              <NumField
                label="Default spend cap (USD)"
                editing={editing}
                value={
                  editing
                    ? (draft.spendCapCents ?? null) !== null
                      ? Math.round((draft.spendCapCents as number) / 100)
                      : null
                    : ctx.property.spendCapCents
                      ? Math.round(ctx.property.spendCapCents / 100)
                      : null
                }
                onChange={(v) => setField("spendCapCents", v === null ? null : v * 100)}
              />
              <Field label="Emergency contact" editing={editing} value={editing ? (draft.emergencyContactName ?? "") : ctx.property.emergencyContactName ?? "—"} onChange={(v) => setField("emergencyContactName", v)} />
              <Field label="Emergency phone" editing={editing} mono value={editing ? (draft.emergencyContactPhone ?? "") : ctx.property.emergencyContactPhone ?? "—"} onChange={(v) => setField("emergencyContactPhone", v)} />
            </Grid>
            <Multi label="Owner instructions" editing={editing} value={editing ? (draft.ownerInstructions ?? "") : ctx.property.ownerInstructions ?? ""} onChange={(v) => setField("ownerInstructions", v)} />
            <Multi label="Building notes (HOA quirks, quiet hours, COI)" editing={editing} value={editing ? (draft.notes ?? "") : ctx.property.notes ?? ""} onChange={(v) => setField("notes", v)} />
          </SidebarAccordion>

          {ctx.preferredContractors.length > 0 ? (
            <SidebarAccordion title="Preferred contractors" icon={<Briefcase className="size-3.5" />}>
              <ul className="flex flex-col gap-1.5">
                {ctx.preferredContractors.slice(0, 5).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-bold text-[#15161A]">{c.name}</div>
                      <div className="text-[0.7rem] font-medium text-[#9AA0A0]">
                        {c.trades.join(" · ")}
                      </div>
                    </div>
                    <span className="text-[0.7rem] font-semibold text-[#9AA0A0]">
                      {new Date(c.lastUsedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </SidebarAccordion>
          ) : null}

          {ctx.recentJobs.length > 0 ? (
            <SidebarAccordion title="Recent jobs" icon={<Briefcase className="size-3.5" />}>
              <ul className="flex flex-col gap-1.5">
                {ctx.recentJobs.slice(0, 6).map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[#15161A]">{j.title}</div>
                      <div className="text-[0.7rem] font-medium text-[#9AA0A0]">
                        {j.trade} · {j.urgency} · {j.status.replace(/_/g, " ")}
                      </div>
                    </div>
                    <span className="text-[0.7rem] font-bold tabular-nums text-[#15161A]">
                      {j.totalCostCents ? fmtUsd(j.totalCostCents) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </SidebarAccordion>
          ) : null}

          <SidebarAccordion title="Units" icon={<Layers className="size-3.5" />}>
            <ul className="flex flex-col gap-1.5 text-sm">
              {ctx.units.map((u) => (
                <li
                  key={u.unit.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-md border border-[#E8E3DA] bg-white text-xs font-black tabular-nums text-[#15161A]">
                      {u.unit.label}
                    </span>
                    <span className="text-[0.75rem] font-medium text-[#6B7070]">
                      {u.tenants.length > 0
                        ? `${u.tenants.length} tenant${u.tenants.length === 1 ? "" : "s"}`
                        : "Vacant"}
                    </span>
                  </span>
                  <span className="font-mono text-[0.7rem] font-bold tabular-nums text-[#15161A]">
                    {u.effectiveSpendCapCents ? fmtUsd(u.effectiveSpendCapCents) : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setAddUnitOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#15161A] px-3.5 py-2 text-xs font-bold text-[#F6F4EF] hover:bg-[#2A2C30]"
            >
              <Plus className="size-3.5" />
              Add unit
            </button>
          </SidebarAccordion>
        </aside>
      </div>

      <AddUnitDialog
        propertyId={propertyId}
        open={addUnitOpen}
        onOpenChange={setAddUnitOpen}
        onAdded={refetch}
      />
    </div>
  );
}

/* ---- Tenant database table (the hero of this page) ----------------------- */

type TenantRow = {
  person: Person;
  unitLabel: string;
  unitId: string;
  floor?: number;
  sqft?: number;
  spendCapCents?: number;
  jobCount: number;
  ownership: "rental" | "owner_occupied";
};

type SortKey = "name" | "unit" | "jobs";
type TypeFilter = "all" | "renters" | "owners";

function TenantTable({
  rows,
  occupiedUnits,
  totalUnits,
}: {
  rows: TenantRow[];
  occupiedUnits: number;
  totalUnits: number;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "unit",
    dir: "asc",
  });

  const ownerCount = useMemo(
    () => rows.filter((r) => r.ownership === "owner_occupied").length,
    [rows],
  );
  const renterCount = rows.length - ownerCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q
      ? rows.filter((r) => {
          const hay = [
            r.person.name,
            r.person.phone,
            r.person.email ?? "",
            r.unitLabel,
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : rows;

    if (typeFilter === "renters") base = base.filter((r) => r.ownership === "rental");
    else if (typeFilter === "owners") base = base.filter((r) => r.ownership === "owner_occupied");

    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...base].sort((a, b) => {
      if (sort.key === "name") return a.person.name.localeCompare(b.person.name) * dir;
      if (sort.key === "jobs") return (a.jobCount - b.jobCount) * dir;
      return (
        a.unitLabel.localeCompare(b.unitLabel, undefined, { numeric: true }) * dir
      );
    });
    return sorted;
  }, [rows, query, sort, typeFilter]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white"
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E3DA] bg-[#F6F4EF] p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3B5A78]">
            <Users className="size-3" />
            Tenant database
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-[#15161A]">
            {rows.length}{" "}
            <span className="text-base font-bold text-[#6B7070]">
              tenant{rows.length === 1 ? "" : "s"} across {occupiedUnits}/{totalUnits} units
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center rounded-full border border-[#E8E3DA] bg-white p-0.5 text-[11px] font-bold uppercase tracking-[0.1em]">
            <FilterChip
              label={`All · ${rows.length}`}
              active={typeFilter === "all"}
              onClick={() => setTypeFilter("all")}
            />
            <FilterChip
              label={`Renters · ${renterCount}`}
              active={typeFilter === "renters"}
              tone="blue"
              onClick={() => setTypeFilter("renters")}
            />
            <FilterChip
              label={`Owners · ${ownerCount}`}
              active={typeFilter === "owners"}
              tone="orange"
              onClick={() => setTypeFilter("owners")}
            />
          </div>
          <label className="relative inline-flex items-center">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-[#9AA0A0]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, unit…"
              className="h-9 w-64 rounded-full border border-[#E8E3DA] bg-white pl-8 pr-3 text-sm font-medium text-[#15161A] placeholder:text-[#9AA0A0] focus:border-[#15161A] focus:outline-none"
            />
          </label>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="p-10 text-center">
          <Users className="mx-auto size-6 text-[#D5CFC6]" />
          <p className="mt-2 text-sm font-semibold text-[#15161A]">
            {rows.length === 0 ? "No tenants yet" : "No matches"}
          </p>
          <p className="text-xs font-medium text-[#9AA0A0]">
            {rows.length === 0
              ? "Add a unit and assign tenants so the agent can match caller-ID."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E8E3DA] bg-white text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#9AA0A0]">
                <th className="px-5 py-3">
                  <SortButton
                    label="Tenant"
                    active={sort.key === "name"}
                    dir={sort.dir}
                    onClick={() => toggleSort("name")}
                  />
                </th>
                <th className="px-3 py-3">
                  <SortButton
                    label="Unit"
                    active={sort.key === "unit"}
                    dir={sort.dir}
                    onClick={() => toggleSort("unit")}
                  />
                </th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Repair billing</th>
                <th className="px-3 py-3">
                  <SortButton
                    label="Jobs"
                    active={sort.key === "jobs"}
                    dir={sort.dir}
                    onClick={() => toggleSort("jobs")}
                  />
                </th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={r.person.id}
                  className={`group border-b border-[#E8E3DA] transition-colors last:border-b-0 hover:bg-[#F6F4EF] ${
                    idx % 2 === 1 ? "bg-[#FAFAF6]" : "bg-white"
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-black text-[#F6F4EF] ${
                          r.ownership === "owner_occupied"
                            ? "bg-[#E8572A]"
                            : "bg-[#15161A]"
                        }`}
                      >
                        {initialsOf(r.person.name)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-[#15161A]">
                          {r.person.name}
                        </div>
                        <div className="text-[0.7rem] font-medium text-[#9AA0A0]">
                          {r.ownership === "owner_occupied" ? "Unit owner" : "Renter"} · ID {r.person.id.slice(0, 6)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex h-7 min-w-[44px] items-center justify-center rounded-md border border-[#E8E3DA] bg-[#F6F4EF] px-1.5 text-xs font-black tabular-nums text-[#15161A]">
                        {r.unitLabel}
                      </span>
                      {r.sqft ? (
                        <span className="text-[0.7rem] font-medium tabular-nums text-[#6B7070]">
                          {r.sqft} sqft
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <TypeBadge ownership={r.ownership} />
                  </td>
                  <td className="px-3 py-3 font-mono text-[0.8rem] tabular-nums text-[#15161A]">
                    {r.person.phone}
                  </td>
                  <td className="px-3 py-3 text-[0.8rem] text-[#15161A]">
                    {r.person.email ? (
                      <span className="truncate">{r.person.email}</span>
                    ) : (
                      <span className="text-[#9AA0A0]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.ownership === "owner_occupied" ? (
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-[0.78rem] font-bold tabular-nums text-[#E8572A]">
                          Owner pays
                        </span>
                        <span className="text-[0.65rem] font-medium text-[#9AA0A0]">
                          Confirms spend live
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col leading-tight">
                        <span className="font-mono text-[0.8rem] font-bold tabular-nums text-[#15161A]">
                          {r.spendCapCents ? fmtUsd(r.spendCapCents) : "—"}
                        </span>
                        <span className="text-[0.65rem] font-medium text-[#9AA0A0]">
                          Landlord covers
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-black tabular-nums ${
                        r.jobCount > 0
                          ? "bg-[#15161A] text-[#F6F4EF]"
                          : "bg-[#F6F4EF] text-[#9AA0A0]"
                      }`}
                    >
                      {r.jobCount}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex items-center gap-1.5 opacity-60 transition-opacity group-hover:opacity-100">
                      <a
                        href={`tel:${r.person.phone}`}
                        aria-label={`Call ${r.person.name}`}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-[#E8E3DA] bg-white text-[#15161A] hover:bg-[#15161A] hover:text-[#F6F4EF]"
                      >
                        <PhoneCall className="size-3.5" />
                      </a>
                      {r.person.email ? (
                        <a
                          href={`mailto:${r.person.email}`}
                          aria-label={`Email ${r.person.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-full border border-[#E8E3DA] bg-white text-[#15161A] hover:bg-[#15161A] hover:text-[#F6F4EF]"
                        >
                          <Mail className="size-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
        active ? "text-[#15161A]" : "text-[#9AA0A0]"
      } hover:text-[#15161A]`}
    >
      {label}
      <ArrowUpDown
        className={`size-3 transition-transform ${
          active && dir === "desc" ? "rotate-180" : ""
        } ${active ? "opacity-100" : "opacity-40"}`}
      />
    </button>
  );
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TypeBadge({ ownership }: { ownership: "rental" | "owner_occupied" }) {
  const isOwner = ownership === "owner_occupied";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
        isOwner
          ? "bg-[#FCE9DF] text-[#C24919]"
          : "bg-[#E6EBF1] text-[#3B5A78]"
      }`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${isOwner ? "bg-[#E8572A]" : "bg-[#3B5A78]"}`}
      />
      {isOwner ? "Owner" : "Renter"}
    </span>
  );
}

function FilterChip({
  label,
  active,
  tone = "ink",
  onClick,
}: {
  label: string;
  active: boolean;
  tone?: "ink" | "blue" | "orange";
  onClick: () => void;
}) {
  const activeColor =
    tone === "blue"
      ? "bg-[#3B5A78] text-white"
      : tone === "orange"
        ? "bg-[#E8572A] text-white"
        : "bg-[#15161A] text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center rounded-full px-3 transition-colors ${
        active ? activeColor : "text-[#6B7070] hover:text-[#15161A]"
      }`}
    >
      {label}
    </button>
  );
}

/* ---- Sidebar accordion (collapsible building info section) --------------- */

function SidebarAccordion({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#E8E3DA] bg-white"
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.04)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F6F4EF]"
      >
        <span className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#15161A]">
          <span className="text-[#9AA0A0]">{icon}</span>
          {title}
        </span>
        {open ? (
          <ChevronDown className="size-4 text-[#9AA0A0]" />
        ) : (
          <ChevronRight className="size-4 text-[#9AA0A0]" />
        )}
      </button>
      {open ? (
        <div className="flex flex-col gap-3 border-t border-[#E8E3DA] p-4">{children}</div>
      ) : null}
    </section>
  );
}

// Keep UserPlus referenced so a future "add tenant" button can import it without
// re-touching the import list. Lints flag unused imports otherwise.
void UserPlus;

/* ---- Unit row (expandable / editable inline) ------------------------------ */

function UnitRow({
  unitCtx,
  buildingSpendCapCents,
  onSaved,
}: {
  unitCtx: UnitCtx;
  buildingSpendCapCents?: number;
  onSaved: () => void | Promise<void>;
}) {
  const u = unitCtx.unit;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Unit>>(u);

  function set<K extends keyof Unit>(key: K, value: Unit[K] | null) {
    setDraft((d) => ({ ...d, [key]: value as Unit[K] }));
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = {};
    const editable = [
      "label", "floor", "bedrooms", "bathrooms", "sqft",
      "lockboxCode", "notes", "spendCapCents", "vacant",
    ] as const;
    for (const k of editable) {
      const v = (draft as Record<string, unknown>)[k];
      if (v === "" || v === undefined) payload[k] = null;
      else payload[k] = v;
    }
    try {
      const res = await fetch(`/api/units/${u.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await onSaved();
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeTenant(personId: string) {
    if (!confirm("Remove this tenant from the unit?")) return;
    const res = await fetch(`/api/units/${u.id}/tenants?personId=${personId}`, { method: "DELETE" });
    if (res.ok) await onSaved();
  }

  return (
    <div className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF]">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black tabular-nums text-[#15161A]" style={{ boxShadow: "inset 0 0 0 1px #E8E3DA" }}>
          {u.label.split(" ")[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#15161A]">
            Unit {u.label}
            {u.vacant ? (
              <span className="rounded-full border border-dashed border-[#9AA0A0] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#6B7070]">
                Vacant
              </span>
            ) : (
              <span className="rounded-full bg-[#15161A] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#F6F4EF]">
                {unitCtx.tenants.length} tenant{unitCtx.tenants.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-[#6B7070]">
            {u.bedrooms || u.bathrooms ? `${u.bedrooms ?? "?"}bd / ${u.bathrooms ?? "?"}ba` : ""}
            {u.sqft ? ` · ${u.sqft} sqft` : ""}
            {u.floor ? ` · floor ${u.floor}` : ""}
            {unitCtx.tenants.length > 0
              ? ` · ${unitCtx.tenants.map((t) => t.name).join(", ")}`
              : ""}
          </div>
        </div>
        {unitCtx.effectiveSpendCapCents ? (
          <div className="hidden text-right sm:block">
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">Spend cap</div>
            <div className="text-xs font-bold tabular-nums text-[#15161A]">
              ${(unitCtx.effectiveSpendCapCents / 100).toFixed(0)}
              {u.spendCapCents && u.spendCapCents !== buildingSpendCapCents ? (
                <span className="ml-1 text-[0.6rem] font-semibold text-[#3B5A78]">unit</span>
              ) : null}
            </div>
          </div>
        ) : null}
        <ChevronDown className={`size-4 text-[#9AA0A0] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="border-t border-[#E8E3DA] bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
              Unit file
            </div>
            {editing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setDraft(u);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E8E3DA] bg-white px-3 py-1.5 text-[0.7rem] font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
                >
                  <X className="size-3" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-full bg-[#15161A] px-3 py-1.5 text-[0.7rem] font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-60"
                >
                  {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                  Save unit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#E8E3DA] bg-white px-3 py-1.5 text-[0.7rem] font-bold text-[#15161A] hover:bg-[#EEEBE4]"
              >
                <Pencil className="size-3" /> Edit unit
              </button>
            )}
          </div>

          <Grid>
            <Field label="Unit label" editing={editing} value={editing ? (draft.label ?? "") : u.label} onChange={(v) => set("label", v)} />
            <NumField label="Floor" editing={editing} value={(editing ? draft.floor : u.floor) ?? null} onChange={(v) => set("floor", v)} />
            <NumField label="Bedrooms" editing={editing} value={(editing ? draft.bedrooms : u.bedrooms) ?? null} onChange={(v) => set("bedrooms", v)} />
            <NumField label="Bathrooms" editing={editing} step={0.5} value={(editing ? draft.bathrooms : u.bathrooms) ?? null} onChange={(v) => set("bathrooms", v)} />
            <NumField label="Sqft" editing={editing} value={(editing ? draft.sqft : u.sqft) ?? null} onChange={(v) => set("sqft", v)} />
            <Field label="Unit lockbox" editing={editing} mono value={editing ? (draft.lockboxCode ?? "") : u.lockboxCode ?? "—"} onChange={(v) => set("lockboxCode", v)} />
            <NumField
              label="Unit spend cap (USD, overrides building)"
              editing={editing}
              value={
                editing
                  ? (draft.spendCapCents ?? null) !== null
                    ? Math.round((draft.spendCapCents as number) / 100)
                    : null
                  : u.spendCapCents
                    ? Math.round(u.spendCapCents / 100)
                    : null
              }
              onChange={(v) => set("spendCapCents", v === null ? null : v * 100)}
            />
          </Grid>
          <Multi label="Unit notes" editing={editing} value={editing ? (draft.notes ?? "") : u.notes ?? ""} onChange={(v) => set("notes", v)} />

          <div className="mt-4 border-t border-[#E8E3DA] pt-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
                <Users className="size-3" />
                Tenants in this unit
              </div>
              <button
                type="button"
                onClick={() => setAddTenantOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-[#E8E3DA] bg-white px-2.5 py-1 text-[0.7rem] font-bold text-[#15161A] hover:bg-[#EEEBE4]"
              >
                <Plus className="size-3" /> Add tenant
              </button>
            </div>
            {unitCtx.tenants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E8E3DA] bg-[#F6F4EF] px-3 py-3 text-center text-xs font-medium text-[#9AA0A0]">
                No tenants on file. Add one so Handle can verify caller-ID.
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {unitCtx.tenants.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2">
                    <div>
                      <div className="text-sm font-bold text-[#15161A]">{t.name}</div>
                      {t.email ? (
                        <div className="text-xs font-medium text-[#9AA0A0]">{t.email}</div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${t.phone}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E3DA] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#15161A] hover:bg-[#EEEBE4]"
                      >
                        <PhoneCall className="size-3 text-[#9AA0A0]" />
                        {t.phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeTenant(t.id)}
                        className="rounded-full border border-[#E8E3DA] bg-white p-1.5 text-[#9AA0A0] hover:bg-[#EEEBE4] hover:text-[#15161A]"
                        aria-label="Remove tenant"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <AddTenantDialog
        unitId={u.id}
        unitLabel={u.label}
        open={addTenantOpen}
        onOpenChange={setAddTenantOpen}
        onAdded={async () => {
          await onSaved();
        }}
      />
    </div>
  );
}

/* ---- Add Unit dialog ----------------------------------------------------- */

function AddUnitDialog({
  propertyId,
  open,
  onOpenChange,
  onAdded,
}: {
  propertyId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void | Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setLabel(""); setBedrooms(""); setBathrooms(""); setLockboxCode("");
    setTenantName(""); setTenantPhone("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}/units`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          lockboxCode: lockboxCode.trim() || undefined,
          tenantName: tenantName.trim() || undefined,
          tenantPhone: tenantPhone.trim() || undefined,
        }),
      });
      if (res.ok) {
        reset();
        onOpenChange(false);
        await onAdded();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight text-[#15161A]">
            Add unit
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#6B7070]">
            Add a unit to this building. You can add the primary tenant now or later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Unit label">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="3B" required />
            </Labeled>
            <Labeled label="Lockbox">
              <Input value={lockboxCode} onChange={(e) => setLockboxCode(e.target.value)} className="font-mono" />
            </Labeled>
            <Labeled label="Bedrooms">
              <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
            </Labeled>
            <Labeled label="Bathrooms">
              <Input type="number" step={0.5} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </Labeled>
          </div>

          <div className="rounded-xl border border-dashed border-[#E8E3DA] p-3">
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
              Primary tenant <span className="font-medium text-[#D5CFC6]">(optional)</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Labeled label="Name">
                <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
              </Labeled>
              <Labeled label="Phone">
                <Input type="tel" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} />
              </Labeled>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#E8E3DA] bg-white px-4 py-2 text-sm font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !label.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-4 py-2 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Add unit
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Add Tenant dialog --------------------------------------------------- */

function AddTenantDialog({
  unitId,
  unitLabel,
  open,
  onOpenChange,
  onAdded,
}: {
  unitId: string;
  unitLabel: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/units/${unitId}/tenants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
        }),
      });
      if (res.ok) {
        setName(""); setPhone(""); setEmail("");
        onOpenChange(false);
        await onAdded();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight text-[#15161A]">
            Add tenant to Unit {unitLabel}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#6B7070]">
            Their phone is what the agent matches against caller-ID.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Labeled label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Labeled>
          <Labeled label="Phone">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </Labeled>
          <Labeled label="Email (optional)">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Labeled>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#E8E3DA] bg-white px-4 py-2 text-sm font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !phone.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-4 py-2 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-60"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Add tenant
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Shared bits --------------------------------------------------------- */

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5">
      <div className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#9AA0A0]">{label}</div>
      <div className="mt-0.5 text-base font-black tabular-nums text-[#15161A]">{value}</div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E8E3DA] bg-white p-5" style={{ boxShadow: "0 1px 4px rgba(21,22,26,0.04)" }}>
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9AA0A0]">
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Field({
  label, value, editing, onChange, mono,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">{label}</Label>
      {editing ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className={mono ? "font-mono" : ""} />
      ) : (
        <div className={`min-h-[2.25rem] rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2 text-sm ${mono ? "font-mono font-semibold" : "font-semibold"} text-[#15161A]`}>
          {value || <span className="font-medium text-[#9AA0A0]">—</span>}
        </div>
      )}
    </div>
  );
}

function NumField({
  label, value, editing, onChange, step = 1,
}: {
  label: string; value: number | null; editing: boolean; onChange: (v: number | null) => void; step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">{label}</Label>
      {editing ? (
        <Input
          type="number"
          step={step}
          value={value === null ? "" : value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
        />
      ) : (
        <div className="min-h-[2.25rem] rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2 text-sm font-bold tabular-nums text-[#15161A]">
          {value === null ? <span className="font-medium text-[#9AA0A0]">—</span> : value}
        </div>
      )}
    </div>
  );
}

function SelectField({
  label, value, options, editing, onChange,
}: {
  label: string; value: string; options: readonly (readonly [string, string])[]; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">{label}</Label>
      {editing ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 rounded-xl border border-[#E8E3DA] bg-white px-3 text-sm font-semibold text-[#15161A]"
        >
          <option value="">—</option>
          {options.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      ) : (
        <div className="min-h-[2.25rem] rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2 text-sm font-semibold text-[#15161A]">
          {value ? (options.find(([k]) => k === value)?.[1] ?? value) : <span className="font-medium text-[#9AA0A0]">—</span>}
        </div>
      )}
    </div>
  );
}

function Multi({
  label, value, editing, onChange,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">{label}</Label>
      {editing ? (
        <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="text-sm" />
      ) : (
        <div className="min-h-[2.5rem] whitespace-pre-wrap rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2 text-sm font-medium text-[#15161A]">
          {value || <span className="text-[#9AA0A0]">—</span>}
        </div>
      )}
    </div>
  );
}
