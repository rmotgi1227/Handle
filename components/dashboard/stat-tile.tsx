import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * KPI tile. Reserved heights so the top row stays rock-stable as values
 * stream in via polling — no layout shift on first paint.
 */
export function StatTile({
  label,
  value,
  delta,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </div>
        {Icon ? (
          <Icon className="size-4 text-zinc-700 dark:text-zinc-300" />
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 tabular-nums">
        {value}
      </div>
      {delta ? (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {delta}
        </div>
      ) : (
        <div className="mt-1 h-4" aria-hidden />
      )}
    </div>
  );
}
