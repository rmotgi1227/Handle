import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

const CONFIG: Record<
  Job["urgency"],
  { bg: string; text: string; dot: string; label: string }
> = {
  emergency: {
    bg: "bg-red-50 border border-red-200",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Emergency",
  },
  urgent: {
    bg: "bg-amber-50 border border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Urgent",
  },
  standard: {
    bg: "bg-[#EEF4F9] border border-[#C7D9E8]",
    text: "text-[#3B5A78]",
    dot: "bg-[#3B5A78]",
    label: "Standard",
  },
  scheduled: {
    bg: "border border-dashed border-[#E8E3DA]",
    text: "text-[#9AA0A0]",
    dot: "border border-[#9AA0A0]",
    label: "Scheduled",
  },
};

export function UrgencyPill({
  urgency,
  className,
}: {
  urgency: Job["urgency"];
  className?: string;
}) {
  const { bg, text, dot, label } = CONFIG[urgency];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        bg,
        text,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
