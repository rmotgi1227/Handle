import "@/lib/store/bootstrap";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { store } from "@/lib/store/memory";

const PatchSchema = z.object({
  label: z.string().min(1).optional(),
  floor: z.number().int().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().nonnegative().nullable().optional(),
  sqft: z.number().int().positive().nullable().optional(),
  lockboxCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  spendCapCents: z.number().int().nonnegative().nullable().optional(),
  vacant: z.boolean().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const unit = store.getUnit(id);
  if (!unit) return Response.json({ error: "unit not found" }, { status: 404 });
  return Response.json({ unit });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const existing = store.getUnit(id);
  if (!existing) return Response.json({ error: "unit not found" }, { status: 404 });

  let body: z.infer<typeof PatchSchema>;
  try {
    body = PatchSchema.parse(await request.json());
  } catch (err) {
    return Response.json(
      { error: "invalid_body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const merged = { ...existing };
  for (const [k, v] of Object.entries(body)) {
    if (v === null) {
      delete (merged as Record<string, unknown>)[k];
    } else if (v !== undefined) {
      (merged as Record<string, unknown>)[k] = v;
    }
  }
  const unit = store.upsertUnit(merged);

  revalidatePath(`/dashboard/properties/${existing.propertyId}`);
  return Response.json({ unit });
}
