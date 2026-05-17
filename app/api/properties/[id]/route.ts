import "@/lib/store/bootstrap";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { store } from "@/lib/store/memory";
import { getPropertyContext } from "@/lib/store/property-context";

const PatchSchema = z.object({
  address: z.string().min(1).optional(),
  unit: z.string().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().positive().nullable().optional(),
  yearBuilt: z.number().int().min(1700).max(2100).nullable().optional(),
  propertyType: z
    .enum(["apartment", "condo", "single_family", "townhouse", "duplex"])
    .nullable()
    .optional(),
  accessNotes: z.string().nullable().optional(),
  gateCode: z.string().nullable().optional(),
  lockboxCode: z.string().nullable().optional(),
  parkingNotes: z.string().nullable().optional(),
  utilityNotes: z.string().nullable().optional(),
  waterShutoffLocation: z.string().nullable().optional(),
  electricalPanelLocation: z.string().nullable().optional(),
  hvacType: z.string().nullable().optional(),
  ownerInstructions: z.string().nullable().optional(),
  spendCapCents: z.number().int().nonnegative().nullable().optional(),
  emergencyContactName: z.string().nullable().optional(),
  emergencyContactPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const ctx = getPropertyContext(id);
  if (!ctx) {
    return Response.json({ error: "property not found" }, { status: 404 });
  }
  return Response.json(ctx);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const existing = store.properties.get(id);
  if (!existing) {
    return Response.json({ error: "property not found" }, { status: 404 });
  }

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "invalid_body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  // Strip explicit-null fields so they clear from the record instead of persisting as null.
  const merged = { ...existing };
  for (const [k, v] of Object.entries(body)) {
    if (v === null) {
      delete (merged as Record<string, unknown>)[k];
    } else if (v !== undefined) {
      (merged as Record<string, unknown>)[k] = v;
    }
  }

  const property = store.upsertProperty(merged);
  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard");
  return Response.json({ property });
}
