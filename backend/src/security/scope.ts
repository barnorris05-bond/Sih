import { REGIONS, type Role } from "@aicte/shared";

/**
 * Pure data-scope rules. Which records a principal may see is decided here and nowhere else, from
 * server-held facts only: the role, the institution the user is bound to, and (for regional officers)
 * the region assigned on the user record. Nothing in a request body, query string or URL
 * participates, and an application's region is always its institution's registered region, never the
 * free-text region a form declares.
 *
 * Deny by default: any principal whose scope cannot be established sees nothing.
 */
export type Scope =
  | { kind: "all" }
  | { kind: "institution"; institutionId: string }
  | { kind: "region"; region: string }
  | { kind: "none" };

export interface Principal {
  role: Role;
  institutionId: string | null;
  /** Server-side assignment from the user record. Only meaningful for regional officers. */
  region?: string | null;
}

export interface ScopedApplication {
  institutionId: string;
  institution: { region: string };
}

const KNOWN_REGIONS: readonly string[] = REGIONS;

export function scopeFor(principal: Principal): Scope {
  switch (principal.role) {
    case "AICTE_ADMIN":
    case "SCRUTINY_MEMBER":
      return { kind: "all" };
    case "INSTITUTION_USER":
      return principal.institutionId
        ? { kind: "institution", institutionId: principal.institutionId }
        : { kind: "none" };
    case "REGIONAL_OFFICER":
      return principal.region && KNOWN_REGIONS.includes(principal.region)
        ? { kind: "region", region: principal.region }
        : { kind: "none" };
    default:
      return { kind: "none" };
  }
}

export function appInScope(scope: Scope, app: ScopedApplication): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "institution":
      return app.institutionId === scope.institutionId;
    case "region":
      return app.institution.region === scope.region;
    default:
      return false;
  }
}
