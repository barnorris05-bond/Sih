import type { Application, PlatformEvent, SessionPayload } from "@aicte/shared";
import { findUserById, getDatabase } from "../store/database";
import { appInScope, scopeFor, type Scope } from "./scope";

/**
 * Resolves what the signed-in user may see. A regional officer's region is read from the user record
 * at request time (not from the session token), so an assignment change or removal takes effect
 * immediately and a missing or unknown user fails closed.
 */
export function resolveScope(session: SessionPayload): Scope {
  const region = session.role === "REGIONAL_OFFICER" ? (findUserById(session.sub)?.region ?? null) : null;
  return scopeFor({ role: session.role, institutionId: session.institutionId, region });
}

export function scopedApplications(scope: Scope): Application[] {
  const { applications } = getDatabase();
  return scope.kind === "all" ? applications : applications.filter((app) => appInScope(scope, app));
}

/**
 * Platform events carry institution names in their text, so they are scoped exactly like the
 * application they refer to. Events that refer to no application are visible only to unrestricted roles.
 */
export function eventVisible(scope: Scope, event: PlatformEvent, applicationById?: Map<string, Application>): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "none" || !event.applicationId) return false;
  const app = applicationById
    ? applicationById.get(event.applicationId)
    : getDatabase().applications.find((item) => item.id === event.applicationId);
  return app ? appInScope(scope, app) : false;
}

export function visibleEvents(scope: Scope, limit: number): PlatformEvent[] {
  const db = getDatabase();
  if (scope.kind === "all") return db.events.slice(0, limit);
  if (scope.kind === "none") return [];
  const byId = new Map(db.applications.map((app) => [app.id, app]));
  const out: PlatformEvent[] = [];
  for (const event of db.events) {
    if (eventVisible(scope, event, byId)) {
      out.push(event);
      if (out.length >= limit) break;
    }
  }
  return out;
}
