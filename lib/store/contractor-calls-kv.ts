/**
 * Cross-lambda shared store for the contractor-call race.
 *
 * On Vercel each lambda instance has its own in-memory store. The dispatch
 * lambda (which places the outbound call and polls for an outcome) and the
 * webhook lambda (which receives AgentPhone's call_ended and writes the
 * outcome) routinely land on different instances. The in-memory Map can't
 * bridge them.
 *
 * This module mirrors `store.contractorCalls` writes into Upstash Redis so
 * the polling lambda can see what the webhook lambda wrote, regardless of
 * which instance handled which.
 *
 * Records expire after 24h — these are short-lived race entries, not
 * durable state. The in-memory Map remains the dashboard's source of truth
 * (Redis is just the cross-lambda fan-out).
 *
 * Gracefully no-ops when KV creds aren't set, so local dev and CI keep
 * working without provisioning a Redis instance.
 */

import { Redis } from "@upstash/redis";
import type { ContractorCall } from "@/lib/types";

const KEY_PREFIX = "ccall:";
const TTL_SECONDS = 24 * 60 * 60;

let _client: Redis | null | undefined; // undefined = not yet probed

function getClient(): Redis | null {
  if (_client !== undefined) return _client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    _client = null;
    return null;
  }
  _client = new Redis({ url, token });
  return _client;
}

/** Fetch a contractor call by callId from KV. Returns undefined if not
 *  present or if KV isn't configured. Never throws. */
export async function kvGetContractorCall(
  callId: string,
): Promise<ContractorCall | undefined> {
  const client = getClient();
  if (!client) return undefined;
  try {
    const raw = await client.get<ContractorCall>(`${KEY_PREFIX}${callId}`);
    return raw ?? undefined;
  } catch (err) {
    console.warn(`[contractor-calls-kv] get failed for ${callId}:`, err);
    return undefined;
  }
}

/** Write a contractor call into KV with a 24h TTL. No-ops when KV isn't
 *  configured. Never throws — caller continues even if Redis is down. */
export async function kvSetContractorCall(
  record: ContractorCall,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.set(`${KEY_PREFIX}${record.id}`, record, { ex: TTL_SECONDS });
  } catch (err) {
    console.warn(
      `[contractor-calls-kv] set failed for ${record.id}:`,
      err,
    );
  }
}
