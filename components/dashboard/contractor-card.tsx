import { Phone, Star, MapPin } from "lucide-react";
import type { Contractor } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceLabel: Record<Contractor["source"], string> = {
  directory: "Directory",
  browser_use: "Browser Use",
  manual: "Manual",
};

export function ContractorCard({
  contractor,
  className,
}: {
  contractor: Contractor;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            {contractor.name}
          </div>
          {contractor.city ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              <MapPin className="size-3" />
              {contractor.city}
            </div>
          ) : null}
        </div>
        {typeof contractor.rating === "number" ? (
          <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
            <Star className="size-3 fill-current" />
            {contractor.rating.toFixed(1)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {contractor.trades.map((t) => (
          <span
            key={t}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[0.7rem] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <a
          href={`tel:${contractor.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          <Phone className="size-3" />
          {contractor.phone}
        </a>
        <span className="text-[0.7rem] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {sourceLabel[contractor.source]}
        </span>
      </div>
    </div>
  );
}
