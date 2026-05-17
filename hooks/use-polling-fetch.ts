"use client";
import { useEffect, useState } from "react";

/**
 * Poll a JSON endpoint at a fixed interval. Returns the latest payload and
 * the most recent error (sticky until the next successful tick).
 *
 * v1 simplicity: no SWR, no AbortController gymnastics. Tabs without focus
 * keep polling — that's fine for a PM dashboard left open during the day.
 */
export function usePollingFetch<T>(url: string, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const json = (await res.json()) as T;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    }
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [url, intervalMs]);

  return { data, error };
}
