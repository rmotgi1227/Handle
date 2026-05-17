import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaStrip() {
  return (
    <section className="w-full bg-white py-12 dark:bg-black">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Built for the YC Call My Agent Hackathon
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
          May 17, 2026
        </p>
        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-black hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
        >
          Open dashboard
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
