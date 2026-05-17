import { nanoid } from "nanoid";
import type {
  Call,
  Contractor,
  ContractorCall,
  Job,
  JobEvent,
  Person,
  Property,
} from "@/lib/types";

/**
 * In-process store. Single source of truth for the v1 dashboard.
 * Replace with Supermemory / Supabase / Postgres in v2.
 *
 * Survives within a single Next.js server process. Resets on dev reload.
 * Seeded once on first import — see `./seed.ts`.
 */
class MemoryStore {
  people = new Map<string, Person>();
  properties = new Map<string, Property>();
  contractors = new Map<string, Contractor>();
  jobs = new Map<string, Job>();
  events = new Map<string, JobEvent>();
  calls = new Map<string, Call>();
  contractorCalls = new Map<string, ContractorCall>();

  // --- Jobs ---
  upsertJob(partial: Partial<Job> & Pick<Job, "title" | "propertyId" | "trade" | "urgency" | "reportedByPersonId">): Job {
    const now = new Date().toISOString();
    const id = partial.id ?? `job_${nanoid(8)}`;
    const existing = this.jobs.get(id);
    const job: Job = {
      id,
      propertyId: partial.propertyId,
      reportedByPersonId: partial.reportedByPersonId,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      status: partial.status ?? existing?.status ?? "triaging",
      urgency: partial.urgency,
      trade: partial.trade,
      title: partial.title,
      description: partial.description ?? existing?.description ?? "",
      diagnosis: partial.diagnosis ?? existing?.diagnosis,
      assignedContractorId: partial.assignedContractorId ?? existing?.assignedContractorId,
      scheduledFor: partial.scheduledFor ?? existing?.scheduledFor,
      totalCostCents: partial.totalCostCents ?? existing?.totalCostCents,
      callIds: partial.callIds ?? existing?.callIds ?? [],
      satisfactionScore: partial.satisfactionScore ?? existing?.satisfactionScore,
      satisfactionFeedback: partial.satisfactionFeedback ?? existing?.satisfactionFeedback,
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  listJobs(): Job[] {
    return Array.from(this.jobs.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  // --- Events ---
  appendEvent(event: Omit<JobEvent, "id" | "at"> & { at?: string }): JobEvent {
    const id = `evt_${nanoid(8)}`;
    const at = event.at ?? new Date().toISOString();
    const full: JobEvent = { ...event, id, at };
    this.events.set(id, full);
    return full;
  }

  listJobEvents(jobId: string): JobEvent[] {
    return Array.from(this.events.values())
      .filter((e) => e.jobId === jobId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  // --- Calls ---
  upsertCall(call: Call): Call {
    this.calls.set(call.id, call);
    return call;
  }

  listCalls(): Call[] {
    return Array.from(this.calls.values()).sort((a, b) =>
      b.startedAt.localeCompare(a.startedAt),
    );
  }

  // --- Contractors ---
  upsertContractor(c: Contractor): Contractor {
    this.contractors.set(c.id, c);
    return c;
  }

  listContractors(): Contractor[] {
    return Array.from(this.contractors.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  // --- People / properties ---
  upsertPerson(p: Person): Person {
    this.people.set(p.id, p);
    return p;
  }

  upsertProperty(p: Property): Property {
    this.properties.set(p.id, p);
    return p;
  }
}

declare global {
  var __callMyAgentStore: MemoryStore | undefined;
}

export const store: MemoryStore =
  globalThis.__callMyAgentStore ?? (globalThis.__callMyAgentStore = new MemoryStore());
