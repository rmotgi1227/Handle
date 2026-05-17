"use client";

import Link from "next/link";
import { PhoneIncoming } from "lucide-react";
import type { Call } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/**
 * Compact call row for the "Recent calls" rail. Solid black pulsing dot for
 * in-flight calls — same dot language as the global live-call indicator.
 */
export function LiveCallCard({ call }: { call: Call }) {
  const live = call.status === "in_progress" || call.status === "ringing";
  const href = call.jobId ? `/dashboard/jobs/${call.jobId}` : "#";

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700",
        !call.jobId && "pointer-events-none",
      )}
    >
      <div className="mt-0.5 flex size-7 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <PhoneIncoming className="size-3.5 text-zinc-700 dark:text-zinc-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {live ? (
            <span
              className="size-1.5 rounded-full bg-black motion-safe:animate-pulse dark:bg-white"
              aria-label="Live"
            />
          ) : null}
          <div className="truncate text-sm font-medium tracking-tight text-zinc-900 dark:text-zinc-50">
            {call.fromNumber}
          </div>
          <div className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            {relativeTime(call.startedAt)}
          </div>
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs leading-snug text-zinc-600 dark:text-zinc-400">
          {call.summary ?? call.transcript[call.transcript.length - 1]?.text ?? "Connecting…"}
        </div>
      </div>
    </Link>
  );
}
