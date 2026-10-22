import { startAlertScheduler } from "./engines/alertScheduler";
import { getDatabase } from "./store/database";

const globalForRuntime = globalThis as unknown as { __aicteRuntime?: boolean };

/** Idempotently boots background automation and materialises the seed dataset. */
export function ensurePlatformRuntime(): void {
  if (globalForRuntime.__aicteRuntime) return;
  globalForRuntime.__aicteRuntime = true;
  getDatabase();
  startAlertScheduler();
}
