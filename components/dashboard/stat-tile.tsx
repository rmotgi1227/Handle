import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
      className={cn("rounded-2xl border border-[#E8E3DA] bg-white p-6", className)}
      style={{ boxShadow: "0 2px 8px rgba(21,22,26,0.05)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#6B7070]">
          {label}
        </div>
        {Icon ? <Icon className="size-4 text-[#3B5A78]" /> : null}
      </div>
      <div className="mt-4 text-4xl font-black tracking-tight text-[#15161A] tabular-nums">
        {value}
      </div>
      {delta ? (
        <div className="mt-1.5 text-xs font-medium text-[#9AA0A0]">{delta}</div>
      ) : (
        <div className="mt-1.5 h-4" aria-hidden />
      )}
    </div>
  );
}
