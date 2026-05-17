"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Briefcase,
  Users,
  Settings,
  PhoneCall,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePollingFetch } from "@/hooks/use-polling-fetch";
import type { Call, Property } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/contractors", label: "Contractors", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function PmSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[180px] shrink-0 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-black">
          <PhoneCall className="size-3.5 text-white" />
        </div>
        <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Call My Agent
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium tracking-tight transition-colors",
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
              )}
            >
              <Icon className="size-4 text-zinc-700 dark:text-zinc-300" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-[0.7rem] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        v1 · mock mode
      </div>
    </aside>
  );
}

type CallsResponse = { calls: Call[] };

/**
 * Top bar with property selector + live-call indicator.
 * Strict monochrome: indicator is a black pulsing dot, never red.
 */
export function PmHeader({ properties }: { properties: Property[] }) {
  const callsRes = usePollingFetch<CallsResponse>("/api/calls", 5000);
  const [selected, setSelected] = useState<string>("all");

  const liveCount = (callsRes.data?.calls ?? []).filter(
    (c) => c.status === "in_progress" || c.status === "ringing",
  ).length;

  const selectedLabel =
    selected === "all"
      ? "All properties"
      : (() => {
          const p = properties.find((x) => x.id === selected);
          return p
            ? `${p.address}${p.unit ? ` · ${p.unit}` : ""}`
            : "All properties";
        })();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium tracking-tight text-zinc-900 transition-colors hover:bg-zinc-50",
              "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
            )}
          >
            <span className="max-w-[16rem] truncate">{selectedLabel}</span>
            <ChevronDown className="size-3.5 text-zinc-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onSelect={() => setSelected("all")}>
            All properties
          </DropdownMenuItem>
          {properties.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => setSelected(p.id)}>
              {p.address}
              {p.unit ? ` · ${p.unit}` : ""}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2 text-xs tracking-tight">
        {liveCount > 0 ? (
          <>
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 rounded-full bg-black opacity-75 motion-safe:animate-ping dark:bg-white" />
              <span className="relative size-2 rounded-full bg-black dark:bg-white" />
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-50 tabular-nums">
              {liveCount} live
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {liveCount === 1 ? "call" : "calls"}
            </span>
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="text-zinc-500 dark:text-zinc-400">No live calls</span>
          </>
        )}
      </div>
    </header>
  );
}
