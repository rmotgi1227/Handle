"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Manager = { id: string; name: string };

const PROPERTY_TYPES = [
  ["apartment_building", "Apartment building"],
  ["condo_building", "Condo building"],
  ["multi_family", "Multi-family"],
  ["duplex", "Duplex"],
  ["townhouse", "Townhouse"],
  ["single_family", "Single-family home"],
] as const;

export function AddPropertyButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] =
    useState<(typeof PROPERTY_TYPES)[number][0]>("apartment_building");
  const [firstUnitLabel, setFirstUnitLabel] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    void fetch("/api/properties", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { managers: Manager[] }) => setManagers(j.managers ?? []))
      .catch(() => {});
  }, [open]);

  function reset() {
    setAddress("");
    setPropertyType("apartment_building");
    setFirstUnitLabel("");
    setTenantName("");
    setTenantPhone("");
  }

  const isSingleFamily = propertyType === "single_family";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const managerId = managers[0]?.id;
    if (!managerId || !address.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: address.trim(),
          managerId,
          propertyType,
          firstUnitLabel: firstUnitLabel.trim() || undefined,
          tenantName: tenantName.trim() || undefined,
          tenantPhone: tenantPhone.trim() || undefined,
        }),
        cache: "no-store",
      });
      if (res.ok) {
        const { property } = (await res.json()) as { property: { id: string } };
        reset();
        setOpen(false);
        router.push(`/dashboard/properties/${property.id}`);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-5 py-2.5 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30]"
      >
        <Plus className="size-4" />
        Add property
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight text-[#15161A]">
              Add a building
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#6B7070]">
              Buildings hold units. Units hold tenants. You&apos;ll add the rest from the building&apos;s file after creating it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address" className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
                Street address
              </Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="342 Valencia St"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ptype" className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
                Type
              </Label>
              <select
                id="ptype"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
                className="h-9 rounded-xl border border-[#E8E3DA] bg-white px-3 text-sm font-semibold text-[#15161A]"
              >
                {PROPERTY_TYPES.map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-dashed border-[#E8E3DA] p-4">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-[#9AA0A0]">
                First unit{" "}
                <span className="font-medium text-[#D5CFC6]">
                  {isSingleFamily ? "(auto: Main)" : "(optional)"}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-[#9AA0A0]">
                {isSingleFamily
                  ? "Single-family homes get one unit labeled “Main” automatically."
                  : "Skip this and add units later from the building file."}
              </p>
              {!isSingleFamily ? (
                <div className="mt-3 flex flex-col gap-1.5">
                  <Label htmlFor="unit-label" className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                    Unit label
                  </Label>
                  <Input
                    id="unit-label"
                    value={firstUnitLabel}
                    onChange={(e) => setFirstUnitLabel(e.target.value)}
                    placeholder="3B"
                  />
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tenant-name" className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                    Tenant name
                  </Label>
                  <Input
                    id="tenant-name"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Marcus Chen"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tenant-phone" className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-[#9AA0A0]">
                    Tenant phone
                  </Label>
                  <Input
                    id="tenant-phone"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="+1 415 555 1410"
                    type="tel"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#E8E3DA] bg-white px-4 py-2 text-sm font-semibold text-[#6B7070] hover:bg-[#F6F4EF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !address.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[#15161A] px-4 py-2 text-sm font-bold text-[#F6F4EF] hover:bg-[#2A2C30] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Create building
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
