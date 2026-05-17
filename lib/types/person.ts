export type PersonRole = "tenant" | "homeowner" | "property_manager";

export interface Person {
  id: string;
  role: PersonRole;
  name: string;
  phone: string;
  email?: string;
  /** Building (Property) the person belongs to. Denormalized for fast caller-ID lookup. */
  propertyId?: string;
  /** Unit within that building (multi-tenant buildings). */
  unitId?: string;
}

/**
 * A Property is a *building*. Multi-tenant buildings have many `Unit`s — each
 * with its own tenants, lockbox code, and layout. Single-family homes live
 * here too: they have exactly one Unit (label "Main").
 *
 * Building-level fields (gate code, water shutoff, owner instructions) live
 * on Property. Anything that varies between units (bedrooms, in-unit
 * lockbox, who lives there) lives on `Unit`.
 *
 * `unit` and `tenantIds` are LEGACY fields kept so older callsites
 * (jobs page, calls/incoming, run.ts) keep working — they display the
 * primary unit label. Migrate them to read `Unit` over time.
 */
export interface Property {
  id: string;
  address: string;
  /** @deprecated Use `units` via the store. Kept for legacy display in jobs/calls. */
  unit?: string;
  managerId: string;
  ownerId: string;
  /** @deprecated Use unit.tenantIds. Kept for legacy single-unit lookups. */
  tenantIds: string[];

  propertyType?:
    | "apartment_building"
    | "condo_building"
    | "single_family"
    | "townhouse"
    | "duplex"
    | "multi_family";
  yearBuilt?: number;

  /** Building-wide access (gates, main lockbox, parking, building notes). */
  accessNotes?: string;
  gateCode?: string;
  /** Main lobby/exterior lockbox. Per-unit lockboxes live on `Unit`. */
  lockboxCode?: string;
  parkingNotes?: string;

  /** Building utilities that contractors ask about. */
  utilityNotes?: string;
  waterShutoffLocation?: string;
  electricalPanelLocation?: string;
  hvacType?: string;

  /** Owner rules the agent enforces before authorizing spend. */
  ownerInstructions?: string;
  /** Default spend cap applied to every unit unless the unit overrides it. */
  spendCapCents?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  /** Building-wide notes (HOA quirks, quiet hours, COI requirements). */
  notes?: string;
}

/**
 * Who pays for maintenance on this unit.
 *  - "rental":         landlord covers repairs (typical apartment).
 *  - "owner_occupied": the occupant owns the unit and pays out of pocket
 *                     (typical condo unit). The agent confirms spend with
 *                     the unit owner before dispatching anything billable.
 */
export type UnitOwnership = "rental" | "owner_occupied";

/** A rentable unit inside a Property (building). */
export interface Unit {
  id: string;
  propertyId: string;
  /** "3B", "Apt 12", "PH", "Main" — what the agent reads back to confirm identity. */
  label: string;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  /** Per-unit lockbox. Falls back to building lockbox if unset. */
  lockboxCode?: string;
  tenantIds: string[];
  /** Marks turnover state; agent skips outbound checks on vacant units. */
  vacant?: boolean;
  /** Overrides the building-level spend cap when set. */
  spendCapCents?: number;
  /** Unit-specific quirks ("garbage disposal jams often"). */
  notes?: string;
  /** Renter or owner-occupier? Drives who authorizes spend. Defaults to "rental". */
  ownership?: UnitOwnership;
}
