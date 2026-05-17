import { nanoid } from "nanoid";
import { z } from "zod";
import { agentphone } from "@/lib/integrations/agentphone";
import { store } from "@/lib/store/memory";
import type { Call, CallTranscriptLine } from "@/lib/types";

const BodySchema = z
  .object({
    mock: z.boolean().optional(),
    fromNumber: z.string().optional(),
    transcript: z.string().optional(),
  })
  .passthrough();

export async function POST(request: Request): Promise<Response> {
  // Tee the request body so we can both validate the JSON shape
  // and hand a fresh Request to the AgentPhone adapter.
  const raw = await request.text();
  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(raw.length > 0 ? JSON.parse(raw) : {});
  } catch (err) {
    return Response.json(
      { error: "Invalid JSON body", detail: (err as Error).message },
      { status: 400 },
    );
  }

  const replay = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: raw.length > 0 ? raw : undefined,
  });

  const inbound = await agentphone.parseInboundWebhook(replay);

  // Lookup the caller by phone number.
  const fromNumber = parsed.fromNumber ?? inbound.fromNumber;
  const person = Array.from(store.people.values()).find((p) => p.phone === fromNumber);
  const property = person?.propertyId ? store.properties.get(person.propertyId) : undefined;

  const transcript: CallTranscriptLine[] = parsed.transcript
    ? [
        {
          at: inbound.startedAt,
          speaker: "agent",
          text: "Hi, you've reached the property line. What's going on?",
        },
        {
          at: inbound.startedAt,
          speaker: "caller",
          text: parsed.transcript,
        },
      ]
    : [];

  const callId = inbound.callId || `call_${nanoid(8)}`;

  // Create a real stub Job up-front so the call_received event and the dashboard
  // both have a real id to link to. runAgent will update this same Job with
  // classification results — the id never changes.
  const jobId = `job_${nanoid(8)}`;
  store.upsertJob({
    id: jobId,
    propertyId: property?.id ?? "prop_unknown",
    reportedByPersonId: person?.id ?? "person_unknown",
    status: "triaging",
    urgency: "standard",
    trade: "general",
    title: parsed.transcript
      ? parsed.transcript.slice(0, 80)
      : person
        ? `New call from ${person.name}`
        : `New call from ${fromNumber}`,
    description: parsed.transcript ?? "",
    callIds: [callId],
  });

  const call: Call = {
    id: callId,
    fromNumber,
    callerId: person?.id,
    callerRole: person?.role,
    propertyId: property?.id,
    status: "in_progress",
    startedAt: inbound.startedAt,
    transcript,
    jobId,
  };
  store.upsertCall(call);

  store.appendEvent({
    jobId,
    kind: "call_received",
    title: person ? `Tenant call received — ${person.name}` : `Call received from ${fromNumber}`,
    detail: property ? `${property.address}${property.unit ? ` Unit ${property.unit}` : ""}` : undefined,
  });

  return Response.json({ callId, jobId });
}
