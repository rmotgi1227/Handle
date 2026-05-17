import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pt-28 pb-24 text-center md:pt-36 md:pb-32">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          <span className="relative flex size-1.5">
            <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-60 dark:bg-white" />
            <span className="relative inline-flex size-1.5 rounded-full bg-black dark:bg-white" />
          </span>
          Live for the YC Call My Agent Hackathon
        </div>

        <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight text-black md:text-6xl dark:text-white">
          Property maintenance, on autopilot.
        </h1>

        <p className="mt-6 max-w-2xl text-balance text-base leading-relaxed text-zinc-600 md:text-lg dark:text-zinc-400">
          Your tenants call one number. An AI agent triages, dials contractors
          in parallel, books the job, and pays them out — all before
          you&apos;ve checked Slack.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="h-11 rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-sm font-medium text-black hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-white dark:hover:bg-zinc-900"
          >
            <Link href="#how-it-works">See how it works</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
