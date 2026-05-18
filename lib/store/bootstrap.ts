/**
 * Import this from any API route or server module that needs the in-memory
 * store seeded. App-router layouts already seed via `app/layout.tsx`, but
 * API routes run in isolated serverless lambdas on Vercel and never load
 * the layout — so without this they see an empty store.
 *
 * `seedOnce()` is idempotent; importing this from multiple places is safe.
 *
 * We also fire-and-forget a sync of the tenant directory to the live
 * AgentPhone triage agent, once per lambda cold start. The agent's system
 * prompt is the source of truth for "who is this caller?", and without
 * this sync the prompt drifts from the seed whenever the seed changes.
 * Gated by `globalThis` so a warm lambda handling many requests only
 * fires the sync the first time.
 */
import { seedOnce } from "./seed";

seedOnce();

declare global {
  var __handleAgentSynced: boolean | undefined;
}

if (!globalThis.__handleAgentSynced) {
  globalThis.__handleAgentSynced = true;
  // Fire-and-forget. Don't block the import on a network call.
  void (async () => {
    try {
      const { syncTriagePromptIfConfigured } = await import(
        "@/lib/integrations/agentphone/sync-triage-prompt"
      );
      await syncTriagePromptIfConfigured();
    } catch (err) {
      console.warn("[bootstrap] triage prompt auto-sync skipped:", err);
    }
  })();
}
