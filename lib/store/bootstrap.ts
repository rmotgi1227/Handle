/**
 * Import this from any API route or server module that needs the in-memory
 * store seeded. App-router layouts already seed via `app/layout.tsx`, but
 * API routes run in isolated serverless lambdas on Vercel and never load
 * the layout — so without this they see an empty store.
 *
 * `seedOnce()` is idempotent; importing this from multiple places is safe.
 */
import { seedOnce } from "./seed";

seedOnce();
