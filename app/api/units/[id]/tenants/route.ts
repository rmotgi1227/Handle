import "@/lib/store/bootstrap";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { store } from "@/lib/store/memory";

const BodySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: unitId } = await params;
  const unit = store.getUnit(unitId);
  if (!unit) return Response.json({ error: "unit not found" }, { status: 404 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "invalid_body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const personId = `person_${nanoid(8)}`;
  store.upsertPerson({
    id: personId,
    role: "tenant",
    name: body.name,
    phone: body.phone,
    email: body.email,
    propertyId: unit.propertyId,
    unitId,
  });

  const updatedUnit = store.upsertUnit({
    ...unit,
    tenantIds: [...unit.tenantIds, personId],
    vacant: false,
  });

  revalidatePath(`/dashboard/properties/${unit.propertyId}`);
  return Response.json({ unit: updatedUnit, personId });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id: unitId } = await params;
  const url = new URL(request.url);
  const personId = url.searchParams.get("personId");
  if (!personId) {
    return Response.json({ error: "personId query param required" }, { status: 400 });
  }
  const unit = store.getUnit(unitId);
  if (!unit) return Response.json({ error: "unit not found" }, { status: 404 });

  const updatedUnit = store.upsertUnit({
    ...unit,
    tenantIds: unit.tenantIds.filter((t) => t !== personId),
    vacant: unit.tenantIds.length === 1,
  });
  store.people.delete(personId);

  revalidatePath(`/dashboard/properties/${unit.propertyId}`);
  return Response.json({ unit: updatedUnit });
}
