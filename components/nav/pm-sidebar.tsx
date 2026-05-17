"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Briefcase,
  Users,
  Settings,
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
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-[#E8E3DA] bg-[#EEEBE4]">
      <Link href="/" className="flex items-center px-6 py-6">
        <Image
          src="/logos/png/wordmark/handle-wordmark-1024.png"
          width={92}
          height={24}
          alt="Handle"
          priority
          className="select-none"
        />
      </Link>

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
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors",
                active
                  ? "bg-white text-[#15161A] shadow-sm"
                  : "text-[#6B7070] hover:bg-[#E8E3DA] hover:text-[#15161A]",
              )}
            >
              <Icon
                className={cn("size-4", active ? "text-[#3B5A78]" : "text-[#9AA0A0]")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#9AA0A0]">
        v1 · mock mode
      </div>
    </aside>
  );
}

type CallsResponse = { calls: Call[] };

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
    <header className="flex h-16 items-center gap-4 border-b border-[#E8E3DA] bg-[#F6F4EF] px-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DA] bg-white px-3.5 py-2 text-sm font-semibold text-[#15161A] transition-colors hover:bg-[#F6F4EF]"
          >
            <span className="max-w-[16rem] truncate">{selectedLabel}</span>
            <ChevronDown className="size-3.5 text-[#6B7070]" />
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

      <div className="ml-auto flex items-center gap-2 text-xs font-semibold tracking-tight">
        {liveCount > 0 ? (
          <>
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 rounded-full bg-[#3B5A78] opacity-75 motion-safe:animate-ping" />
              <span className="relative size-2 rounded-full bg-[#3B5A78]" />
            </span>
            <span className="text-[#15161A] tabular-nums">{liveCount} live</span>
            <span className="text-[#9AA0A0]">{liveCount === 1 ? "call" : "calls"}</span>
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-[#D5CFC6]" />
            <span className="text-[#9AA0A0]">No live calls</span>
          </>
        )}
      </div>
    </header>
  );
}
