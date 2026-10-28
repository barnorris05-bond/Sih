import type {
  AnalyticsSnapshot,
  Application,
  ApplicationState,
  PlatformEvent,
} from "@aicte/shared";
import type { SessionPayload } from "@aicte/shared";
import { buildAnalytics } from "../engines/analytics";
import { resolveScope, scopedApplications, visibleEvents } from "../security/access";

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

export function getAnalytics(session: SessionPayload): AnalyticsSnapshot {
  return buildAnalytics(scopedApplications(resolveScope(session)));
}

export function getAuditFeed(session: SessionPayload, limit = 24): AuditFeedItem[] {
  const feed: AuditFeedItem[] = [];
  for (const application of scopedApplications(resolveScope(session))) {
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

export function getSlaQueue(session: SessionPayload, limit = 12): Application[] {
  return scopedApplications(resolveScope(session))
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

export function getEventFeed(session: SessionPayload, limit = 30): PlatformEvent[] {
  return visibleEvents(resolveScope(session), limit);
}
