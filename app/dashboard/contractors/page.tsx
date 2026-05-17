"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ContractorCard } from "@/components/dashboard/contractor-card";
import type { Contractor } from "@/lib/types";

type ContractorsResponse = { contractors: Contractor[] };

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [trade, setTrade] = useState("plumbing");
  const [city, setCity] = useState("San Francisco");
  const [searching, setSearching] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/contractors", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as ContractorsResponse;
        setContractors(json.contractors);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function findMore(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    try {
      await fetch("/api/contractors/find", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trade, city }),
        cache: "no-store",
      });
      await load();
      setOpen(false);
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

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-10 text-center text-sm font-medium text-[#9AA0A0]">
          Loading…
        </div>
      ) : contractors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E8E3DA] p-10 text-center text-sm font-medium text-[#9AA0A0]">
          No contractors yet. Click &ldquo;Find more&rdquo; to seed the pool.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contractors.map((c) => (
            <ContractorCard key={c.id} contractor={c} />
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div
            className="relative w-full max-w-sm rounded-2xl border border-[#E8E3DA] bg-white p-6"
            style={{ boxShadow: "0 16px 48px rgba(21,22,26,0.18)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[#9AA0A0] hover:text-[#15161A]"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-base font-bold text-[#15161A]">Find contractors</h3>
            <p className="mt-1 text-sm font-medium text-[#9AA0A0]">
              Browser Use scans local directories by trade and city.
            </p>
            <form onSubmit={findMore} className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7070]" htmlFor="trade">Trade</label>
                <input
                  id="trade"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  placeholder="plumbing"
                  className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-sm font-medium text-[#15161A] placeholder:text-[#9AA0A0] focus:border-[#3B5A78] focus:outline-none focus:ring-2 focus:ring-[#3B5A78]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7070]" htmlFor="city">City</label>
                <input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  className="rounded-xl border border-[#E8E3DA] bg-[#F6F4EF] px-3 py-2.5 text-sm font-medium text-[#15161A] placeholder:text-[#9AA0A0] focus:border-[#3B5A78] focus:outline-none focus:ring-2 focus:ring-[#3B5A78]/20"
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-[#E8E3DA] px-4 py-2 text-xs font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={searching}
                  className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-5 py-2 text-xs font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:opacity-40"
                >
                  {searching ? <><Loader2 className="size-3 animate-spin" /> Searching…</> : "Search"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
