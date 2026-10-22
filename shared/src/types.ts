export type Role =
  | "INSTITUTION_USER"
  | "REGIONAL_OFFICER"
  | "SCRUTINY_MEMBER"
  | "AICTE_ADMIN";

export const ROLES: Role[] = [
  "INSTITUTION_USER",
  "REGIONAL_OFFICER",
  "SCRUTINY_MEMBER",
  "AICTE_ADMIN",
];

export type ApplicationState =
  | "DRAFT"
  | "SUBMITTED"
  | "RULE_VALIDATION_FAILED"
  | "UNDER_SCRUTINY"
  | "DEFICIENCY_NOTIFIED"
  | "EVC_INSPECTION"
  | "APPROVED"
  | "REJECTED";

export const APPLICATION_STATES: ApplicationState[] = [
  "DRAFT",
  "SUBMITTED",
  "RULE_VALIDATION_FAILED",
  "UNDER_SCRUTINY",
  "DEFICIENCY_NOTIFIED",
  "EVC_INSPECTION",
  "APPROVED",
  "REJECTED",
];

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RuleCategory = "FACULTY" | "INFRASTRUCTURE" | "ACADEMIC";

export interface RuleDefinition {
  code: string;
  title: string;
  category: RuleCategory;
  severity: Severity;
  weight: number;
  description: string;
  thresholdField: string;
  thresholdValue: number | number[];
  accreditedThresholdValue?: number;
  remediation: string;
}

export interface RuleBook {
  version: string;
  effectiveFrom: string;
  source: string;
  rules: RuleDefinition[];
}

export interface Program {
  id: string;
  name: string;
  degree: "B.Tech" | "M.Tech" | "MBA" | "MCA" | "B.Arch" | "Diploma";
  intake: number;
  accredited: boolean;
}

export interface ApplicationDocument {
  id: string;
  name: string;
  category: "LAND" | "FINANCE" | "FACULTY" | "INFRASTRUCTURE" | "AFFILIATION";
  fileName: string;
  sizeKb: number;
  verified: boolean;
}

/**
 * Dynamic form payload. Stored as JSONB in the production schema so that new
 * handbook fields can be collected without a migration.
 */
export interface ApplicationFormData {
  institutionName: string;
  state: string;
  region: string;
  city: string;
  campusType: "PERMANENT" | "TEMPORARY";
  totalStudentIntake: number;
  facultyCount: number;
  professorsCount: number;
  associateProfessorsCount: number;
  assistantProfessorsCount: number;
  phdFacultyCount: number;
  builtUpArea: number;
  landArea: number;
  libraryVolumes: number;
  labInvestmentLakhs: number;
  programs: Program[];
  documents: ApplicationDocument[];
}

export interface DeficiencyDraft {
  ruleCode: string;
  title: string;
  severity: Severity;
  requiredValue: string;
  actualValue: string;
  description: string;
}

export interface RuleEvaluationResult {
  /** Weighted compliance index, 0-100. */
  score: number;
  isCompliant: boolean;
  totalRules: number;
  passedRules: number;
  deficiencies: DeficiencyDraft[];
  checks: RuleCheck[];
}

export interface RuleCheck {
  code: string;
  title: string;
  category: RuleCategory;
  severity: Severity;
  weight: number;
  passed: boolean;
  requiredValue: string;
  actualValue: string;
  description: string;
  remediation: string;
}

export interface Institution {
  id: string;
  aicteCode: string;
  name: string;
  state: string;
  region: string;
  city: string;
  landAreaSqMeters: number;
  builtUpAreaSqMeters: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  institutionId: string | null;
  createdAt: string;
}

export interface PublicUser extends User {
  institutionName: string | null;
}

export interface Application {
  id: string;
  institutionId: string;
  institution: Institution;
  academicYear: string;
  currentState: ApplicationState;
  formData: ApplicationFormData;
  complianceScore: number;
  slaDeadline: string | null;
  submittedAt: string | null;
  escalated: boolean;
  decisionNotes: string | null;
  deficiencies: Deficiency[];
  auditLogs: AuditLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Deficiency {
  id: string;
  applicationId: string;
  ruleCode: string;
  severity: Severity;
  title: string;
  description: string;
  requiredValue: string;
  actualValue: string;
  remediationDeadline: string;
  isResolved: boolean;
  createdAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  applicationId: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  previousState: ApplicationState;
  newState: ApplicationState;
  actionNotes: string;
  automated: boolean;
  timestamp: string;
}

export interface PlatformEvent {
  id: string;
  type:
    | "STATE_CHANGED"
    | "DEFICIENCY_RAISED"
    | "SLA_WARNING"
    | "SLA_BREACHED"
    | "APPLICATION_SUBMITTED"
    | "APPLICATION_APPROVED";
  title: string;
  message: string;
  applicationId: string | null;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  timestamp: string;
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  institutionId: string | null;
  institutionName: string | null;
  exp?: number;
  iat?: number;
}

export interface WorkflowAction {
  target: ApplicationState;
  notes: string;
}

export interface KpiSummary {
  totalApplications: number;
  approved: number;
  underReview: number;
  activeDeficiencies: number;
  slaBreaches: number;
  approvalRate: number;
  averageCompliance: number;
  medianCycleDays: number;
}

export interface StateDistribution {
  state: string;
  region: string;
  total: number;
  approved: number;
  deficient: number;
  pending: number;
  approvalRate: number;
  averageCompliance: number;
}

export interface RegionDistribution {
  region: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

export interface SlaBucket {
  stage: string;
  breached: number;
  atRisk: number;
  healthy: number;
}

export interface AnalyticsSnapshot {
  kpis: KpiSummary;
  states: StateDistribution[];
  regions: RegionDistribution[];
  slaBuckets: SlaBucket[];
  deficiencyBreakdown: Array<{ ruleCode: string; label: string; count: number; severity: Severity }>;
  stateTransitions: Array<{ stage: ApplicationState; count: number }>;
  complianceHistogram: Array<{ bucket: string; count: number }>;
  generatedAt: string;
}
