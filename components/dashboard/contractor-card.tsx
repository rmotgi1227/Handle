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
        "flex flex-col gap-3 rounded-2xl border border-[#E8E3DA] bg-white p-5",
        className,
      )}
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold tracking-tight text-[#15161A]">
            {contractor.name}
          </div>
          {contractor.city ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#9AA0A0]">
              <MapPin className="size-3" />
              {contractor.city}
            </div>
          ) : null}
        </div>
        {typeof contractor.rating === "number" ? (
          <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#3B5A78] tabular-nums">
            <Star className="size-3 fill-current" />
            {contractor.rating.toFixed(1)}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {contractor.trades.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[#E8E3DA] bg-[#F6F4EF] px-2 py-0.5 text-[0.7rem] font-semibold capitalize text-[#6B7070]"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-[#E8E3DA] pt-3">
        <a
          href={`tel:${contractor.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B5A78] hover:text-[#15161A]"
        >
          <Phone className="size-3" />
          {contractor.phone}
        </a>
        <span className="text-[0.7rem] font-bold uppercase tracking-wide text-[#9AA0A0]">
          {sourceLabel[contractor.source]}
        </span>
      </div>
    </div>
  );
}
