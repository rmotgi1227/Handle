"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Search, Wallet, Users } from "lucide-react";
import { ContractorCard, type EnrichedContractor } from "./contractor-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SortKey = "recent" | "rating" | "jobs" | "spend";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently dispatched" },
  { key: "jobs", label: "Most jobs" },
  { key: "spend", label: "Most paid" },
  { key: "rating", label: "Top rated" },
];

export function ContractorsView({ contractors }: { contractors: EnrichedContractor[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [trade, setTrade] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [open, setOpen] = useState(false);
  const [searchTrade, setSearchTrade] = useState("plumbing");
  const [searchCity, setSearchCity] = useState("San Francisco");
  const [searching, setSearching] = useState(false);

  const allTrades = useMemo(() => {
    const s = new Set<string>();
    for (const c of contractors) for (const t of c.trades) s.add(t);
    return Array.from(s).sort();
  }, [contractors]);

  const stats = useMemo(() => {
    const total = contractors.length;
    const usdc = contractors.filter((c) => c.walletAddress).length;
    const ratings = contractors
      .map((c) => c.rating)
      .filter((r): r is number => typeof r === "number");
    const avg = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
    const dispatched = contractors.filter((c) => c.metrics.jobsCompleted > 0).length;
    return { total, usdc, avg, dispatched };
  }, [contractors]);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = contractors.filter((c) => {
      if (trade && !c.trades.includes(trade as never)) return false;
      if (q) {
        const hay = `${c.name} ${c.city ?? ""} ${c.trades.join(" ")} ${c.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      switch (sort) {
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "jobs":
          return b.metrics.jobsCompleted - a.metrics.jobsCompleted;
        case "spend":
          return b.metrics.lifetimeSpendCents - a.metrics.lifetimeSpendCents;
        case "recent":
        default: {
          const ax = a.metrics.lastDispatchedAt ?? "";
          const bx = b.metrics.lastDispatchedAt ?? "";
          return bx.localeCompare(ax);
        }
      }
    });
  }, [contractors, query, trade, sort]);

  async function findMore(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      await fetch("/api/contractors/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trade: searchTrade, city: searchCity }),
        cache: "no-store",
      });
      setOpen(false);
      router.refresh();
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#15161A]">Contractors</h1>
          <p className="mt-1 text-sm font-medium text-[#6B7070]">
            Pre-vetted directory plus contractors the agent discovers as it dials.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-5 py-2.5 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30]"
        >
          <Plus className="size-4" />
          Find more
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="In network" value={stats.total.toString()} icon={<Users className="size-3.5" />} />
        <StatTile label="USDC ready" value={`${stats.usdc} / ${stats.total}`} icon={<Wallet className="size-3.5" />} hint="Instant payout via Sponge" />
        <StatTile label="Dispatched" value={`${stats.dispatched}`} hint="Worked at least one job" />
        <StatTile label="Avg rating" value={stats.avg} hint="Across pre-vetted vendors" />
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl border border-[#E8E3DA] bg-white p-4"
        style={{ boxShadow: "0 1px 4px rgba(21,22,26,0.04)" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#9AA0A0]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, trade, city or phone"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-xl border border-[#E8E3DA] bg-white px-3 text-xs font-semibold text-[#15161A]"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <TradeChip label="All" active={trade === null} onClick={() => setTrade(null)} />
          {allTrades.map((t) => (
            <TradeChip
              key={t}
              label={t.replace(/_/g, " ")}
              active={trade === t}
              onClick={() => setTrade((cur) => (cur === t ? null : t))}
            />
          ))}
        </div>
      </div>

      {filteredSorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-10 text-center text-sm font-medium text-[#9AA0A0]">
          {contractors.length === 0
            ? "No contractors yet. Click “Find more” to seed the pool."
            : "No contractors match those filters."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSorted.map((c) => <ContractorCard key={c.id} contractor={c} />)}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-[#15161A]">
              Find more contractors
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#6B7070]">
              Browser Use scans local directories and adds new candidates to your pool.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={findMore} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trade" className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">Trade</Label>
              <Input id="trade" value={searchTrade} onChange={(e) => setSearchTrade(e.target.value)} placeholder="plumbing" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city" className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">City</Label>
              <Input id="city" value={searchCity} onChange={(e) => setSearchCity(e.target.value)} placeholder="San Francisco" />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#E8E3DA] bg-white px-4 py-2 text-sm font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={searching}
                className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-4 py-2 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-60"
              >
                {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                {searching ? "Searching…" : "Search"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-[#E8E3DA] bg-white p-4"
      style={{ boxShadow: "0 1px 4px rgba(21,22,26,0.04)" }}
    >
      <div className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#9AA0A0]">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-black tabular-nums text-[#15161A]">{value}</div>
      {hint ? <div className="mt-0.5 text-[0.7rem] font-medium text-[#9AA0A0]">{hint}</div> : null}
    </div>
  );
}

function TradeChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors",
        active
          ? "bg-[#15161A] text-[#F6F4EF]"
          : "border border-[#E8E3DA] bg-white text-[#6B7070] hover:bg-[#F6F4EF] hover:text-[#15161A]",
      )}
    >
      {label}
    </button>
  );
}
