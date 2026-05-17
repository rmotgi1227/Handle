import { Home } from "lucide-react";
import { store } from "@/lib/store/memory";
import { AddPropertyButton } from "@/components/dashboard/add-property-button";
import { PropertyGrid } from "@/components/dashboard/property-grid";

export default function PropertiesPage() {
  const properties = Array.from(store.properties.values());
  const people = Array.from(store.people.values());
  const jobs = store.listJobs();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#15161A]">Properties</h1>
          <p className="mt-1 text-sm font-medium text-[#6B7070]">
            Click any property to open the client file the agent reads back during calls.
          </p>
        </div>
        <AddPropertyButton />
      </div>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E8E3DA] bg-white p-10 text-center">
          <Home className="mx-auto size-8 text-[#D5CFC6]" />
          <p className="mt-3 text-sm font-semibold text-[#15161A]">No properties yet</p>
          <p className="mt-1 text-xs font-medium text-[#9AA0A0]">
            Add your first unit to start routing tenant calls.
          </p>
        </div>
      ) : (
        <PropertyGrid properties={properties} people={people} jobs={jobs} />
      )}
    </div>
  );
}
