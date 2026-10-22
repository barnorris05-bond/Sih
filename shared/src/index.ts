import ruleBookJson from "../rules/aphRules.json";
import type { ApplicationState, Role, RuleBook } from "./types";

export * from "./types";
export * from "./rule-engine";

export const ruleBook = ruleBookJson as unknown as RuleBook;

export const ACADEMIC_YEAR = "2026-2027";

export const SESSION_COOKIE = "aicte_session";

/** Development-only signing key. Always override with AUTH_SECRET in production. */
export const AUTH_SECRET_FALLBACK = "aicte-demo-secret-rotate-before-production-2026";

/** SLA windows applied when an application enters each workflow stage. */
export const SLA_HOURS: Partial<Record<ApplicationState, number>> = {
  SUBMITTED: 48,
  UNDER_SCRUTINY: 72,
  DEFICIENCY_NOTIFIED: 168,
  EVC_INSPECTION: 120,
};

/** Response window granted to institutions for every reported deficiency. */
export const REMEDIATION_HOURS = 168;

export const TERMINAL_STATES: ApplicationState[] = ["APPROVED", "REJECTED"];

export function isTerminalState(state: ApplicationState): boolean {
  return TERMINAL_STATES.includes(state);
}

export const STATE_META: Record<
  ApplicationState,
  { label: string; short: string; description: string; tone: "neutral" | "info" | "warning" | "danger" | "success" }
> = {
  DRAFT: {
    label: "Draft",
    short: "Draft",
    description: "Application is being prepared by the institution.",
    tone: "neutral",
  },
  SUBMITTED: {
    label: "Submitted",
    short: "Submitted",
    description: "Awaiting automated rule validation and scrutiny assignment.",
    tone: "info",
  },
  RULE_VALIDATION_FAILED: {
    label: "Rule Validation Failed",
    short: "Validation failed",
    description: "One or more AICTE handbook rules were not satisfied.",
    tone: "danger",
  },
  UNDER_SCRUTINY: {
    label: "Under Scrutiny",
    short: "Scrutiny",
    description: "A scrutiny member is auditing documents and declared metrics.",
    tone: "info",
  },
  DEFICIENCY_NOTIFIED: {
    label: "Deficiency Notified",
    short: "Deficiency",
    description: "Show-cause issued. The institution must remediate before the deadline.",
    tone: "warning",
  },
  EVC_INSPECTION: {
    label: "EVC Inspection",
    short: "EVC",
    description: "Expert visit committee has been scheduled for physical verification.",
    tone: "info",
  },
  APPROVED: {
    label: "Approved",
    short: "Approved",
    description: "Letter of approval issued for the academic year.",
    tone: "success",
  },
  REJECTED: {
    label: "Rejected",
    short: "Rejected",
    description: "Application rejected after scrutiny or expert committee review.",
    tone: "danger",
  },
};

export const ROLE_META: Record<Role, { label: string; description: string; home: string }> = {
  INSTITUTION_USER: {
    label: "Institution",
    description: "Prepare applications, resolve deficiencies and track approval status.",
    home: "/institution",
  },
  SCRUTINY_MEMBER: {
    label: "Scrutiny Desk",
    description: "Audit declarations, flag deficiencies and clear applications.",
    home: "/reviewer",
  },
  REGIONAL_OFFICER: {
    label: "Regional Officer",
    description: "Monitor regional SLA performance and escalate bottlenecks.",
    home: "/admin",
  },
  AICTE_ADMIN: {
    label: "AICTE Admin",
    description: "Command the national pipeline, approve institutions and audit the system.",
    home: "/admin",
  },
};

export const REGIONS = [
  "North",
  "South",
  "East",
  "West",
  "Central",
  "North-East",
] as const;

export const STATES_BY_REGION: Record<string, string[]> = {
  North: ["Delhi", "Haryana", "Punjab", "Uttar Pradesh", "Uttarakhand", "Himachal Pradesh", "Jammu & Kashmir"],
  South: ["Tamil Nadu", "Karnataka", "Kerala", "Telangana", "Andhra Pradesh", "Puducherry"],
  East: ["West Bengal", "Odisha", "Bihar", "Jharkhand"],
  West: ["Maharashtra", "Gujarat", "Rajasthan", "Goa"],
  Central: ["Madhya Pradesh", "Chhattisgarh"],
  "North-East": ["Assam", "Meghalaya", "Manipur", "Tripura", "Nagaland", "Arunachal Pradesh", "Mizoram", "Sikkim"],
};

export function formatState(state: ApplicationState): string {
  return STATE_META[state].label;
}
