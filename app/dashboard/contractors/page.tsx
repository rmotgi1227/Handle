"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ContractorCard } from "@/components/dashboard/contractor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

  useEffect(() => {
    void load();
  }, []);

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
          <h1 className="text-2xl font-semibold tracking-tight">Contractors</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Pre-vetted directory plus contractors the agent discovers as it
            dials.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus />
              Find more
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Search for contractors</DialogTitle>
              <DialogDescription>
                Browser Use scans local directories and returns candidates by
                trade and city.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={findMore} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trade">Trade</Label>
                <Input
                  id="trade"
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  placeholder="plumbing"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={searching}>
                  {searching ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Searching…
                    </>
                  ) : (
                    "Search"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Loading…
        </div>
      ) : contractors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No contractors yet. Click &ldquo;Find more&rdquo; to seed the pool.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contractors.map((c) => (
            <ContractorCard key={c.id} contractor={c} />
          ))}
        </div>
      )}
    </div>
  );
}
