import type {
  AnalyticsSnapshot,
  Application,
  ApplicationState,
  PlatformEvent,
} from "@aicte/shared";
import { buildAnalytics } from "../engines/analytics";
import { getDatabase, recentEvents } from "../store/database";

export interface AuditFeedItem {
  id: string;
  applicationId: string;
  institution: string;
  actorName: string;
  actorRole: string;
  actionNotes: string;
  previousState: ApplicationState;
  newState: ApplicationState;
  automated: boolean;
  timestamp: string;
}

export function getAnalytics(): AnalyticsSnapshot {
  return buildAnalytics();
}

export function getAuditFeed(limit = 24): AuditFeedItem[] {
  const db = getDatabase();
  const feed: AuditFeedItem[] = [];
  for (const application of db.applications) {
    for (const audit of application.auditLogs) {
      feed.push({
        id: audit.id,
        applicationId: application.id,
        institution: application.institution.name,
        actorName: audit.actorName,
        actorRole: audit.actorRole,
        actionNotes: audit.actionNotes,
        previousState: audit.previousState,
        newState: audit.newState,
        automated: audit.automated,
        timestamp: audit.timestamp,
      });
    }
  }
  return feed.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}

export function getSlaQueue(limit = 12): Application[] {
  const db = getDatabase();
  return db.applications
    .filter(
      (app) =>
        app.slaDeadline !== null &&
        app.currentState !== "APPROVED" &&
        app.currentState !== "REJECTED",
    )
    .sort((a, b) => {
      if (a.escalated !== b.escalated) return a.escalated ? -1 : 1;
      return (a.slaDeadline ?? "").localeCompare(b.slaDeadline ?? "");
    })
    .slice(0, limit);
}

export function getEventFeed(limit = 30): PlatformEvent[] {
  return recentEvents(limit);
}
