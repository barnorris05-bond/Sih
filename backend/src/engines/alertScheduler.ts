import { randomUUID } from "node:crypto";
import { STATE_META } from "@aicte/shared";
import { getDatabase, saveDatabase } from "../store/database";
import { emitEvent } from "../sockets/eventBus";

const SWEEP_INTERVAL_MS = 20_000;
const AT_RISK_WINDOW_MS = 12 * 60 * 60 * 1000;

const globalForScheduler = globalThis as unknown as {
  __aicteScheduler?: NodeJS.Timeout;
  __aicteSweepInFlight?: boolean;
};

export interface SlaSweepResult {
  escalated: number;
  atRisk: number;
  checkedAt: string;
}

/**
 * Finds applications whose SLA deadline has passed but that were never
 * escalated, writes an automated audit entry, and publishes a critical event.
 * In a production deployment this same sweep is driven by a BullMQ repeatable
 * job (see README) so it survives restarts and horizontal scaling.
 */
export function sweepSlaDeadlines(reference = Date.now()): SlaSweepResult {
  if (globalForScheduler.__aicteSweepInFlight) {
    return { escalated: 0, atRisk: 0, checkedAt: new Date(reference).toISOString() };
  }
  globalForScheduler.__aicteSweepInFlight = true;
  try {
    const db = getDatabase();
    let escalated = 0;
    let atRisk = 0;

    for (const application of db.applications) {
      if (!application.slaDeadline) continue;
      if (application.currentState === "APPROVED" || application.currentState === "REJECTED") {
        continue;
      }
      const deadline = new Date(application.slaDeadline).getTime();
      if (Number.isNaN(deadline)) continue;

      if (deadline <= reference && !application.escalated) {
        application.escalated = true;
        application.updatedAt = new Date(reference).toISOString();
        application.auditLogs.push({
          id: randomUUID(),
          applicationId: application.id,
          actorId: "system-sla-engine",
          actorName: "SLA Automation Engine",
          actorRole: "AICTE_ADMIN",
          previousState: application.currentState,
          newState: application.currentState,
          actionNotes: `SLA window exceeded at ${STATE_META[application.currentState].label}. Auto-escalated to the Regional Officer.`,
          automated: true,
          timestamp: new Date(reference).toISOString(),
        });
        emitEvent({
          type: "SLA_BREACHED",
          title: "SLA breached — auto-escalated",
          message: `${application.institution.name} exceeded the ${STATE_META[application.currentState].label} window.`,
          applicationId: application.id,
          severity: "CRITICAL",
        });
        escalated += 1;
      } else if (
        !application.escalated &&
        deadline > reference &&
        deadline - reference <= AT_RISK_WINDOW_MS
      ) {
        atRisk += 1;
      }
    }

    if (escalated > 0) saveDatabase();
    return {
      escalated,
      atRisk,
      checkedAt: new Date(reference).toISOString(),
    };
  } finally {
    globalForScheduler.__aicteSweepInFlight = false;
  }
}

/** Starts a single background timer per server process (HMR safe). */
export function startAlertScheduler(): void {
  if (globalForScheduler.__aicteScheduler) return;
  sweepSlaDeadlines();
  const timer = setInterval(() => {
    try {
      sweepSlaDeadlines();
    } catch (error) {
      console.error("[sla-scheduler] sweep failed", error);
    }
  }, SWEEP_INTERVAL_MS);
  timer.unref?.();
  globalForScheduler.__aicteScheduler = timer;
}

export function stopAlertScheduler(): void {
  if (globalForScheduler.__aicteScheduler) {
    clearInterval(globalForScheduler.__aicteScheduler);
    globalForScheduler.__aicteScheduler = undefined;
  }
}
