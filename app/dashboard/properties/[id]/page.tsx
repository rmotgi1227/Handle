import "@/lib/store/bootstrap";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPropertyContext } from "@/lib/orchestrator/property-context";
import { PropertyDetailClient } from "@/components/dashboard/property-detail-client";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = getPropertyContext(id);
  if (!ctx) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/properties"
        className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#9AA0A0] hover:text-[#15161A]"
      >
        <ArrowLeft className="size-3" />
        All properties
      </Link>
      <PropertyDetailClient initialContext={ctx} />
    </div>
  );
}
