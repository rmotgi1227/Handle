import "@/lib/store/bootstrap";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { store } from "@/lib/store/memory";

const BodySchema = z.object({
  label: z.string().min(1),
  floor: z.number().int().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().nonnegative().optional(),
  sqft: z.number().int().positive().optional(),
  lockboxCode: z.string().optional(),
  spendCapCents: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  tenantName: z.string().optional(),
  tenantPhone: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: propertyId } = await params;
  const property = store.properties.get(propertyId);
  if (!property) {
    return Response.json({ error: "property not found" }, { status: 404 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "invalid_body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const unitId = `unit_${nanoid(8)}`;
  const tenantIds: string[] = [];

  if (body.tenantName && body.tenantPhone) {
    const tenantId = `person_${nanoid(8)}`;
    store.upsertPerson({
      id: tenantId,
      role: "tenant",
      name: body.tenantName,
      phone: body.tenantPhone,
      propertyId,
      unitId,
    });
    tenantIds.push(tenantId);
  }

  const unit = store.upsertUnit({
    id: unitId,
    propertyId,
    label: body.label,
    floor: body.floor,
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    sqft: body.sqft,
    lockboxCode: body.lockboxCode,
    spendCapCents: body.spendCapCents,
    notes: body.notes,
    tenantIds,
    vacant: tenantIds.length === 0,
  });

  revalidatePath(`/dashboard/properties/${propertyId}`);
  revalidatePath("/dashboard/properties");
  return Response.json({ unit });
}
