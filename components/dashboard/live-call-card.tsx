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
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function LiveCallCard({ call }: { call: Call }) {
  const live = call.status === "in_progress" || call.status === "ringing";
  const href = call.jobId ? `/dashboard/jobs/${call.jobId}` : "#";

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-2xl border border-[#E8E3DA] bg-white p-4 transition-all hover:-translate-y-px hover:border-[#D5CFC6]",
        !call.jobId && "pointer-events-none",
      )}
      style={{ boxShadow: "0 1px 4px rgba(21,22,26,0.04)" }}
    >
      <div className="mt-0.5 flex size-7 items-center justify-center rounded-full bg-[#EEF4F9] text-[#3B5A78]">
        <PhoneIncoming className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {live ? (
            <span className="relative inline-flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-[#3B5A78] opacity-75 motion-safe:animate-ping" />
              <span className="relative size-1.5 rounded-full bg-[#3B5A78]" />
            </span>
          ) : null}
          <div className="truncate text-sm font-semibold text-[#15161A]">
            {call.fromNumber}
          </div>
          <div className="ml-auto shrink-0 text-xs font-medium text-[#9AA0A0] tabular-nums">
            {relativeTime(call.startedAt)}
          </div>
        </div>
        <div className="mt-0.5 line-clamp-2 text-xs font-medium leading-snug text-[#6B7070]">
          {call.summary ?? call.transcript[call.transcript.length - 1]?.text ?? "Connecting…"}
        </div>
      </div>
    </Link>
  );
}
