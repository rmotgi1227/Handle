import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { store } from "@/lib/store/memory";

const BodySchema = z.object({
  address: z.string().min(1),
  managerId: z.string().min(1),
  propertyType: z
    .enum(["apartment_building", "condo_building", "multi_family", "duplex", "townhouse", "single_family"])
    .optional(),
  /** If set, seeds an initial unit with this label. Required for single-family homes. */
  firstUnitLabel: z.string().optional(),
  tenantName: z.string().optional(),
  tenantPhone: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "invalid_body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const propertyId = `prop_${nanoid(8)}`;
  // Single-family homes implicitly get a "Main" unit.
  const seedUnitLabel =
    body.firstUnitLabel ?? (body.propertyType === "single_family" ? "Main" : undefined);

  let firstUnitId: string | undefined;
  let firstTenantId: string | undefined;

  if (seedUnitLabel) {
    firstUnitId = `unit_${nanoid(8)}`;

    if (body.tenantName && body.tenantPhone) {
      firstTenantId = `person_${nanoid(8)}`;
      store.upsertPerson({
        id: firstTenantId,
        role: "tenant",
        name: body.tenantName,
        phone: body.tenantPhone,
        propertyId,
        unitId: firstUnitId,
      });
    }

    store.upsertUnit({
      id: firstUnitId,
      propertyId,
      label: seedUnitLabel,
      tenantIds: firstTenantId ? [firstTenantId] : [],
      vacant: !firstTenantId,
    });
  }

  const property = store.upsertProperty({
    id: propertyId,
    address: body.address,
    unit: seedUnitLabel,
    managerId: body.managerId,
    ownerId: body.managerId,
    tenantIds: firstTenantId ? [firstTenantId] : [],
    propertyType: body.propertyType,
  });

  revalidatePath("/dashboard/properties");
  revalidatePath("/dashboard");

  return Response.json({ property, unitId: firstUnitId });
}

export async function GET(): Promise<Response> {
  return Response.json({
    properties: Array.from(store.properties.values()),
    managers: Array.from(store.people.values()).filter(
      (p) => p.role === "property_manager",
    ),
  });
}
