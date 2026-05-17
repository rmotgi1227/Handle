import type { ReactNode } from "react";
import { PmSidebar, PmHeader } from "@/components/nav/pm-sidebar";
import { store } from "@/lib/store/memory";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const properties = Array.from(store.properties.values());

  return (
    <div className="flex h-screen bg-[#F6F4EF] text-[#15161A]">
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
