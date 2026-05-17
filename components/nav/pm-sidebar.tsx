"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  Briefcase,
  Users,
  Home,
  CreditCard,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Activity,
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

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
  exact?: boolean;
  badge?: "liveCalls";
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, exact: true, badge: "liveCalls" },
  { href: "/dashboard/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard/properties", label: "Properties", icon: Home },
  { href: "/dashboard/contractors", label: "Contractors", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
];

export function PmSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const callsRes = usePollingFetch<CallsResponse>("/api/calls", 5000);
  const liveCount = (callsRes.data?.calls ?? []).filter(
    (c) => c.status === "in_progress" || c.status === "ringing",
  ).length;
  const callsToday = (callsRes.data?.calls ?? []).filter((c) => {
    const t = new Date(c.startedAt ?? Date.now()).toDateString();
    return t === new Date().toDateString();
  }).length;

  const width = collapsed ? "w-[72px]" : "w-[240px]";

  function isActive(item: NavItem): boolean {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function badgeFor(item: NavItem): number | null {
    if (item.badge === "liveCalls" && liveCount > 0) return liveCount;
    return null;
  }

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-[#E8E3DA] bg-[#EEEBE4] transition-[width] duration-200",
        width,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-6">
        <Link
          href="/"
          aria-label="Handle home"
          className={cn(
            "flex items-center transition-opacity",
            collapsed ? "justify-center" : "",
          )}
        >
          {collapsed ? (
            <Image
              src="/logos/svg/handle-favicon.svg"
              width={24}
              height={24}
              alt="Handle"
              priority
              className="select-none"
            />
          ) : (
            <Image
              src="/logos/png/wordmark/handle-wordmark-1024.png"
              width={92}
              height={24}
              alt="Handle"
              priority
              className="select-none"
            />
          )}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="inline-flex size-7 items-center justify-center rounded-md text-[#9AA0A0] hover:bg-white hover:text-[#15161A]"
          >
            <ChevronsLeft className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Live status pill */}
      <div className="px-3 pb-3">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border border-[#E8E3DA] bg-white px-3 py-2.5",
            collapsed ? "justify-center px-2" : "",
          )}
        >
          <span className="relative inline-flex size-2 shrink-0">
            <span
              className={cn(
                "absolute inset-0 rounded-full opacity-75",
                liveCount > 0
                  ? "animate-ping bg-[#E8572A]"
                  : "bg-[#3B5A78]",
              )}
            />
            <span
              className={cn(
                "relative size-2 rounded-full",
                liveCount > 0 ? "bg-[#E8572A]" : "bg-[#3B5A78]",
              )}
            />
          </span>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#15161A]">
                {liveCount > 0
                  ? `${liveCount} live call${liveCount === 1 ? "" : "s"}`
                  : "Agent online"}
              </div>
              <div className="text-[10px] font-medium text-[#9AA0A0]">
                {callsToday} call{callsToday === 1 ? "" : "s"} today
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        <SidebarSection label="Workspace" collapsed={collapsed}>
          {PRIMARY_NAV.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActive(item)}
              badge={badgeFor(item)}
              collapsed={collapsed}
            />
          ))}
        </SidebarSection>

        <div className="mt-auto" />

        {!collapsed ? (
          <div className="mb-3 rounded-xl border border-[#E8E3DA] bg-white p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#3B5A78]">
              <Activity className="size-3" /> Pulse
            </div>
            <p className="mt-1 text-[11px] font-medium leading-snug text-[#6B7070]">
              {liveCount > 0
                ? `Agent is on ${liveCount} call${liveCount === 1 ? "" : "s"} right now.`
                : "Quiet line. Agent is standing by."}
            </p>
          </div>
        ) : null}
      </nav>

      {/* User card */}
      <div className="border-t border-[#E8E3DA] p-3">
        <UserCard collapsed={collapsed} />
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="absolute right-[-12px] top-7 inline-flex size-6 items-center justify-center rounded-full border border-[#E8E3DA] bg-white text-[#15161A] shadow-sm hover:bg-[#F6F4EF]"
        >
          <ChevronsRight className="size-3.5" />
        </button>
      ) : null}
    </aside>
  );
}

function SidebarSection({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed ? (
        <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9AA0A0]">
          {label}
        </div>
      ) : (
        <div className="mb-1 mx-2 h-px bg-[#E8E3DA]" />
      )}
      {children}
    </div>
  );
}

function SidebarLink({
  item,
  active,
  badge,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  badge: number | null;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors",
        active
          ? "bg-white text-[#15161A] shadow-[0_1px_2px_rgba(21,22,26,0.06)]"
          : "text-[#6B7070] hover:bg-[#E8E3DA] hover:text-[#15161A]",
        collapsed ? "justify-center px-2" : "",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#3B5A78]"
        />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-[#3B5A78]" : "text-[#9AA0A0] group-hover:text-[#15161A]",
        )}
      />
      {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
      {badge !== null && !collapsed ? (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8572A] px-1.5 text-[10px] font-black tabular-nums text-white">
          {badge}
        </span>
      ) : null}
      {badge !== null && collapsed ? (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[#E8572A]"
        />
      ) : null}
    </Link>
  );
}

function UserCard({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#15161A] text-xs font-black text-[#F6F4EF]">
          N
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-2.5 py-2">
      <span className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#15161A] text-xs font-black text-[#F6F4EF]">
        N
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-[#28C840]"
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-[#15161A]">
          Nicolas
        </div>
        <div className="truncate text-[10px] font-medium text-[#9AA0A0]">
          Property manager
        </div>
      </div>
    </div>
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
