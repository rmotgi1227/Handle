import {
  Phone,
  Brain,
  Stethoscope,
  Search,
  ListChecks,
  PhoneOutgoing,
  PhoneCall,
  UserCheck,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  MailQuestion,
  Star,
  Receipt,
  DollarSign,
  StickyNote,
} from "lucide-react";
import type { JobEvent, JobEventKind } from "@/lib/types";

const iconFor: Record<JobEventKind, typeof Phone> = {
  call_received: Phone,
  intent_classified: Brain,
  diagnosed: Stethoscope,
  contractor_search_started: Search,
  contractor_search_completed: ListChecks,
  contractor_dial_started: PhoneOutgoing,
  contractor_dial_outcome: PhoneCall,
  contractor_assigned: UserCheck,
  scheduled: CalendarClock,
  work_started: PlayCircle,
  work_completed: CheckCircle2,
  survey_sent: MailQuestion,
  survey_completed: Star,
  invoice_sent: Receipt,
  paid: DollarSign,
  note: StickyNote,
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function absoluteTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Vertical timeline, latest at top. Rail is a single hairline; nodes are
 * black-ringed circles so the line of events reads as a single column at
 * a glance.
 */
export function JobTimeline({ events }: { events: JobEvent[] }) {
  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No events yet.
      </div>
    );
  }

  return (
    <ol className="relative ml-2">
      <span
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800"
      />
      {ordered.map((event) => {
        const Icon = iconFor[event.kind] ?? StickyNote;
        return (
          <li key={event.id} className="relative pl-7 pb-5 last:pb-0">
            <span className="absolute left-0 top-1 flex size-[15px] items-center justify-center rounded-full border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950">
              <Icon className="size-2.5 text-zinc-700 dark:text-zinc-300" />
            </span>
            <div className="flex items-baseline gap-2">
              <div className="text-sm font-medium leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">
                {event.title}
              </div>
              <time
                className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums"
                title={absoluteTime(event.at)}
                dateTime={event.at}
              >
                {relativeTime(event.at)}
              </time>
            </div>
            {event.detail ? (
              <div className="mt-1 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
                {event.detail}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
