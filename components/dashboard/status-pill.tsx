import { cn } from "@/lib/utils";
import type { Job } from "@/lib/types";

const IN_FLIGHT = new Set<Job["status"]>([
  "triaging",
  "sourcing_contractor",
  "scheduled",
  "in_progress",
  "awaiting_survey",
  "awaiting_payment",
  "payment_authorized",
]);

const LABEL: Record<Job["status"], string> = {
  triaging: "Triaging",
  sourcing_contractor: "Sourcing",
  scheduled: "Scheduled",
  in_progress: "In progress",
  awaiting_survey: "Awaiting survey",
  awaiting_payment: "Awaiting payment",
  payment_authorized: "Payment authorized",
  paid: "Paid",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusPill({
  status,
  className,
}: {
  status: Job["status"];
  className?: string;
}) {
  const live = IN_FLIGHT.has(status);
  const done = status === "completed";
  const paid = status === "paid";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        live && "bg-[#EEF4F9] text-[#3B5A78]",
        done && "bg-[#EEEBE4] text-[#6B7070]",
        paid && "bg-[#ECFDF5] text-[#065F46]",
        status === "cancelled" && "border border-[#E8E3DA] text-[#9AA0A0]",
        className,
      )}
    >
      {live ? (
        <span className="relative inline-flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-[#3B5A78] opacity-75 motion-safe:animate-ping" />
          <span className="relative size-1.5 rounded-full bg-[#3B5A78]" />
        </span>
      ) : paid ? (
        <span className="size-1.5 rounded-full bg-[#065F46]" />
      ) : done ? (
        <span className="size-1.5 rounded-full bg-[#6B7070]" />
      ) : (
        <span className="size-1.5 rounded-full border border-[#9AA0A0]" />
      )}
      {LABEL[status]}
    </span>
  );
}
