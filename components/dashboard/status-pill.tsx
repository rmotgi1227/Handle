import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/lib/types";

const labels: Record<JobStatus, string> = {
  triaging: "Triaging",
  sourcing_contractor: "Sourcing",
  scheduled: "Scheduled",
  in_progress: "In progress",
  awaiting_survey: "Awaiting survey",
  awaiting_payment: "Awaiting payment",
  completed: "Completed",
  cancelled: "Cancelled",
};

type Treatment = "in_flight" | "done" | "cancelled" | "failed";

const treatment: Record<JobStatus, Treatment> = {
  triaging: "in_flight",
  sourcing_contractor: "in_flight",
  scheduled: "in_flight",
  in_progress: "in_flight",
  awaiting_survey: "in_flight",
  awaiting_payment: "in_flight",
  completed: "done",
  cancelled: "cancelled",
};

/**
 * Status reads through dot treatment alone — never through hue.
 * - in_flight: solid black, pulsing
 * - done: solid black, static
 * - cancelled: outline-only
 * - failed: solid black pulsing + small X glyph
 */
export function StatusPill({
  status,
  failed = false,
  className,
}: {
  status: JobStatus;
  failed?: boolean;
  className?: string;
}) {
  const kind: Treatment = failed ? "failed" : treatment[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
        kind === "failed" && "text-zinc-900 dark:text-zinc-100",
        className,
      )}
    >
      {kind === "cancelled" ? (
        <span className="size-1.5 rounded-full border border-zinc-400 bg-transparent" />
      ) : (
        <span
          className={cn(
            "size-1.5 rounded-full bg-black dark:bg-white",
            (kind === "in_flight" || kind === "failed") &&
              "motion-safe:animate-pulse",
          )}
        />
      )}
      {labels[status]}
      {kind === "failed" && <X className="size-3" />}
    </span>
  );
}
