import { cn } from "@/lib/utils";
import type { JobUrgency } from "@/lib/types";

/**
 * Monochrome urgency. Status conveyed through fill weight, ring, and dash
 * pattern — never hue. Reads at a glance from across the room.
 */
const labels: Record<JobUrgency, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  standard: "Standard",
  scheduled: "Scheduled",
};

export function UrgencyPill({
  urgency,
  className,
}: {
  urgency: JobUrgency;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap";

  if (urgency === "emergency") {
    return (
      <span className={cn(base, "bg-black text-white", className)}>
        <span className="size-1.5 rounded-full bg-white" />
        {labels[urgency]}
      </span>
    );
  }
  if (urgency === "urgent") {
    return (
      <span
        className={cn(
          base,
          "bg-zinc-900 text-white ring-1 ring-zinc-700 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950",
          className,
        )}
      >
        {labels[urgency]}
      </span>
    );
  }
  if (urgency === "standard") {
    return (
      <span
        className={cn(
          base,
          "border border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
          className,
        )}
      >
        {labels[urgency]}
      </span>
    );
  }
  // scheduled
  return (
    <span
      className={cn(
        base,
        "border border-dashed border-zinc-300 bg-transparent text-zinc-500 dark:border-zinc-700 dark:text-zinc-400",
        className,
      )}
    >
      {labels[urgency]}
    </span>
  );
}
