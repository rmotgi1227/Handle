import { Phone, Star, MapPin, Briefcase, Wallet, Clock } from "lucide-react";
import type { Contractor } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ContractorMetrics = {
  jobsCompleted: number;
  lifetimeSpendCents: number;
  lastDispatchedAt?: string;
  avgSatisfaction?: number;
};

export type EnrichedContractor = Contractor & { metrics: ContractorMetrics };

const sourceLabel: Record<Contractor["source"], string> = {
  directory: "Directory",
  browser_use: "Browser Use",
  manual: "Manual",
};

const TRADE_HUE: Record<string, string> = {
  plumbing: "bg-[#E8EEF5] text-[#2B4763]",
  electrical: "bg-[#FAE9D4] text-[#7A4A12]",
  hvac: "bg-[#E0EFE6] text-[#1F5A38]",
  appliance: "bg-[#EFE2F1] text-[#5D2B65]",
  locksmith: "bg-[#F2E5DD] text-[#6E3B22]",
  pest_control: "bg-[#F5E0DF] text-[#6E2E2A]",
  cleaning: "bg-[#E8F3F4] text-[#1F5860]",
  general: "bg-[#EEEBE4] text-[#3C3A33]",
  roofing: "bg-[#E5E3F0] text-[#37356A]",
  landscaping: "bg-[#E2EFD7] text-[#2E5418]",
};

function initials(name: string): string {
  const words = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

function fmtUsd(cents: number): string {
  if (cents >= 100000) return `$${(cents / 100 / 1000).toFixed(1)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function fmtRelative(iso?: string): string {
  if (!iso) return "Never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function ContractorCard({
  contractor,
  className,
}: {
  contractor: EnrichedContractor;
  className?: string;
}) {
  const m = contractor.metrics;
  return (
    <div
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-[#E8E3DA] bg-white p-5 transition-shadow hover:border-[#D5CFC6] hover:shadow-md",
        className,
      )}
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#15161A] text-sm font-black tracking-tight text-[#F6F4EF]"
          aria-hidden="true"
        >
          {initials(contractor.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-bold tracking-tight text-[#15161A]">
              {contractor.name}
            </h3>
            {typeof contractor.rating === "number" ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums text-[#3B5A78]">
                <Star className="size-3 fill-current" />
                {contractor.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
          {contractor.city ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#9AA0A0]">
              <MapPin className="size-3" />
              {contractor.city}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {contractor.trades.map((t) => (
          <span
            key={t}
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.7rem] font-semibold capitalize",
              TRADE_HUE[t] ?? "bg-[#F6F4EF] text-[#6B7070]",
            )}
          >
            {t.replace(/_/g, " ")}
          </span>
        ))}
        {contractor.walletAddress ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#15161A] px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.06em] text-[#F6F4EF]">
            <Wallet className="size-3" />
            USDC
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-[#E8E3DA] pt-3 text-xs">
        <div>
          <dt className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
            <Briefcase className="size-3" />
            Jobs
          </dt>
          <dd className="mt-0.5 text-sm font-black tabular-nums text-[#15161A]">{m.jobsCompleted}</dd>
        </div>
        <div>
          <dt className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
            Lifetime
          </dt>
          <dd className="mt-0.5 text-sm font-black tabular-nums text-[#15161A]">
            {m.lifetimeSpendCents > 0 ? fmtUsd(m.lifetimeSpendCents) : "—"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
            <Clock className="size-3" />
            Last
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums text-[#15161A]">
            {fmtRelative(m.lastDispatchedAt)}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2 border-t border-[#E8E3DA] pt-3">
        <a
          href={`tel:${contractor.phone}`}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#3B5A78] hover:text-[#15161A]"
        >
          <Phone className="size-3" />
          {contractor.phone}
        </a>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.1em]",
            contractor.source === "browser_use"
              ? "border-[#3B5A78] bg-[#E8EEF5] text-[#2B4763]"
              : contractor.source === "manual"
                ? "border-[#9AA0A0] bg-[#F6F4EF] text-[#6B7070]"
                : "border-[#E8E3DA] bg-[#F6F4EF] text-[#9AA0A0]",
          )}
        >
          {sourceLabel[contractor.source]}
        </span>
      </div>
    </div>
  );
}
