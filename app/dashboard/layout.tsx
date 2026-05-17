import type { ReactNode } from "react";
import { PmSidebar, PmHeader } from "@/components/nav/pm-sidebar";
import { store } from "@/lib/store/memory";

/**
 * PM-only shell: 180px sidebar + main column with sticky header.
 * Background is zinc-50 / zinc-950 so cards (white / zinc-900) lift.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  // The header's property selector is a thin client component; we hand it
  // the property list as a server-rendered prop so the first paint is full.
  const properties = Array.from(store.properties.values());

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <PmSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PmHeader properties={properties} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
