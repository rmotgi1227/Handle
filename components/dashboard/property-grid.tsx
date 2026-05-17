import Link from "next/link";
import { MapPin, User, Layers, Briefcase, ArrowRight } from "lucide-react";
import { store } from "@/lib/store/memory";
import type { Job, Person, Property } from "@/lib/types";

const ACTIVE_STATUSES = new Set<Job["status"]>([
  "triaging",
  "sourcing_contractor",
  "scheduled",
  "in_progress",
  "awaiting_survey",
  "awaiting_payment",
  "payment_authorized",
]);

const PROPERTY_TYPE_LABEL: Record<NonNullable<Property["propertyType"]>, string> = {
  apartment_building: "Apartment building",
  condo_building: "Condo building",
  multi_family: "Multi-family",
  duplex: "Duplex",
  townhouse: "Townhouse",
  single_family: "Single-family home",
};

export function PropertyGrid({
  properties,
  people,
  jobs,
}: {
  properties: Property[];
  people: Person[];
  jobs: Job[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((p) => {
        const units = store.listUnitsForProperty(p.id);
        const occupied = units.filter((u) => u.tenantIds.length > 0).length;
        const propertyJobs = jobs.filter((j) => j.propertyId === p.id);
        const active = propertyJobs.filter((j) => ACTIVE_STATUSES.has(j.status)).length;
        const lifetimeCents = propertyJobs
          .filter((j) => j.status === "paid" || j.status === "completed")
          .reduce((sum, j) => sum + (j.totalCostCents ?? 0), 0);
        const manager = people.find((x) => x.id === p.managerId);
        const owner = people.find((x) => x.id === p.ownerId);
        const typeLabel = p.propertyType ? PROPERTY_TYPE_LABEL[p.propertyType] : "Building";

        return (
          <Link
            key={p.id}
            href={`/dashboard/properties/${p.id}`}
            className="group flex flex-col gap-4 rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-shadow hover:border-[#D5CFC6] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#15161A]/10"
            style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9AA0A0]">
                  <MapPin className="size-3" />
                  <span>{typeLabel}</span>
                </div>
                <h3 className="mt-1.5 truncate text-base font-bold tracking-tight text-[#15161A]">
                  {p.address}
                </h3>
              </div>
              {active > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#15161A] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#F6F4EF]">
                  <span className="size-1.5 rounded-full bg-[#3B5A78]" />
                  {active} active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#E8E3DA] px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                  Quiet
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-[#E8E3DA] pt-4 text-xs">
              <Stat label="Units" value={`${units.length}`} />
              <Stat label="Occupied" value={`${occupied}/${units.length || 0}`} />
              <Stat
                label="Lifetime"
                value={`$${(lifetimeCents / 100).toFixed(0)}`}
                hint="spend"
              />
            </div>

            <dl className="grid grid-cols-2 gap-3 border-t border-[#E8E3DA] pt-4 text-xs">
              <div>
                <dt className="font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">Manager</dt>
                <dd className="mt-1 flex items-center gap-1.5 truncate font-semibold text-[#15161A]">
                  <User className="size-3 shrink-0 text-[#9AA0A0]" />
                  {manager?.name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">Owner</dt>
                <dd className="mt-1 flex items-center gap-1.5 truncate font-semibold text-[#15161A]">
                  <User className="size-3 shrink-0 text-[#9AA0A0]" />
                  {owner?.name ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between border-t border-[#E8E3DA] pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#9AA0A0]">
              <span className="flex items-center gap-1.5">
                <Layers className="size-3" />
                {units.length === 1 ? "1 unit" : `${units.length} units`}
                {propertyJobs.length > 0 ? (
                  <>
                    <span className="text-[#D5CFC6]">·</span>
                    <Briefcase className="size-3" />
                    {propertyJobs.length}
                  </>
                ) : null}
              </span>
              <span className="inline-flex items-center gap-1 text-[#15161A] opacity-0 transition-opacity group-hover:opacity-100">
                Open file
                <ArrowRight className="size-3" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">{label}</div>
      <div className="mt-1 font-black tabular-nums text-[#15161A]">{value}</div>
      {hint ? <div className="text-[0.65rem] font-medium text-[#9AA0A0]">{hint}</div> : null}
    </div>
  );
}
