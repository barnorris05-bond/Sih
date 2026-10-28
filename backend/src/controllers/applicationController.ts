import { randomUUID } from "node:crypto";
import {
  ACADEMIC_YEAR,
  REMEDIATION_HOURS,
  SLA_HOURS,
  STATE_META,
  type Application,
  type ApplicationSummary,
  type ApplicationFormData,
  type ApplicationState,
  type AuditLog,
  type Deficiency,
  type Role,
  type SessionPayload,
} from "@aicte/shared";
import { evaluateCompliance } from "../engines/ruleEngine";
import { validateStateTransition } from "../engines/stateMachine";
import { emitEvent } from "../sockets/eventBus";
import {
  findApplication,
  findInstitution,
  getDatabase,
  mutateDatabase,
  type DatabaseShape,
} from "../store/database";
import { resolveScope, scopedApplications } from "../security/access";
import { appInScope } from "../security/scope";

export class WorkflowError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "WORKFLOW_ERROR") {
    super(message);
    this.name = "WorkflowError";
    this.status = status;
    this.code = code;
  }
}

interface Actor {
  id: string;
  name: string;
  role: Role;
  institutionId: string | null;
}

function actorFrom(session: SessionPayload): Actor {
  return {
    id: session.sub,
    name: session.name,
    role: session.role,
    institutionId: session.institutionId,
  };
}

const HOUR_MS = 60 * 60 * 1000;

function addHours(hours: number): string {
  return new Date(Date.now() + hours * HOUR_MS).toISOString();
}

function appendAudit(
  app: Application,
  actor: Actor,
  previousState: ApplicationState,
  newState: ApplicationState,
  notes: string,
  automated = false,
): void {
  const entry: AuditLog = {
    id: randomUUID(),
    applicationId: app.id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    previousState,
    newState,
    actionNotes: notes,
    automated,
    timestamp: new Date().toISOString(),
  };
  app.auditLogs.push(entry);
}

function normalized(form: ApplicationFormData): ApplicationFormData {
  const number = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  return {
    ...form,
    totalStudentIntake: Math.round(number(form.totalStudentIntake)),
    facultyCount: Math.round(number(form.facultyCount)),
    professorsCount: Math.round(number(form.professorsCount)),
    associateProfessorsCount: Math.round(number(form.associateProfessorsCount)),
    assistantProfessorsCount: Math.round(number(form.assistantProfessorsCount)),
    phdFacultyCount: Math.round(number(form.phdFacultyCount)),
    builtUpArea: Math.round(number(form.builtUpArea)),
    landArea: Math.round(number(form.landArea)),
    libraryVolumes: Math.round(number(form.libraryVolumes)),
    labInvestmentLakhs: Math.round(number(form.labInvestmentLakhs)),
    programs: Array.isArray(form.programs) ? form.programs : [],
    documents: Array.isArray(form.documents) ? form.documents : [],
  };
}

function assertInstitutionAccess(actor: Actor, app: Application): void {
  if (actor.role !== "INSTITUTION_USER") return;
  if (!actor.institutionId || app.institutionId !== actor.institutionId) {
    throw new WorkflowError("This application belongs to another institution.", 403, "FORBIDDEN");
  }
}

/**
 * Single gate for reading or acting on one application. Out-of-scope regional officers (and anyone with
 * no scope) get the same 404 as a record that does not exist, so a guessed or leaked id reveals nothing.
 * Institution users keep their existing 403 for another institution's record.
 */
function assertInScope(session: SessionPayload, app: Application): void {
  const scope = resolveScope(session);
  if (appInScope(scope, app)) return;
  if (scope.kind === "institution") {
    throw new WorkflowError("This application belongs to another institution.", 403, "FORBIDDEN");
  }
  throw new WorkflowError("Application not found.", 404, "NOT_FOUND");
}

function buildDeficiencies(app: Application, formData: ApplicationFormData): Deficiency[] {
  const evaluation = evaluateCompliance(formData);
  const existingCodes = new Set(
    app.deficiencies.filter((deficiency) => !deficiency.isResolved).map((d) => d.ruleCode),
  );
  return evaluation.deficiencies
    .filter((deficiency) => !existingCodes.has(deficiency.ruleCode))
    .map((deficiency) => ({
      id: randomUUID(),
      applicationId: app.id,
      ruleCode: deficiency.ruleCode,
      severity: deficiency.severity,
      title: deficiency.title,
      description: deficiency.description,
      requiredValue: deficiency.requiredValue,
      actualValue: deficiency.actualValue,
      remediationDeadline: addHours(REMEDIATION_HOURS),
      isResolved: false,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }));
}

export function listApplications(session: SessionPayload): Application[] {
  return [...scopedApplications(resolveScope(session))].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Drops the heavy form payload and audit trail; see {@link ApplicationSummary}. */
export function summarizeApplication(app: Application): ApplicationSummary {
  const { formData: _formData, auditLogs: _auditLogs, ...summary } = app;
  return summary;
}

export function listApplicationSummaries(session: SessionPayload): ApplicationSummary[] {
  return listApplications(session).map(summarizeApplication);
}

export function getApplication(session: SessionPayload, id: string): Application {
  const app = findApplication(id);
  if (!app) throw new WorkflowError("Application not found.", 404, "NOT_FOUND");
  assertInScope(session, app);
  return app;
}

export function blankFormData(institutionId: string): ApplicationFormData {
  const institution = findInstitution(institutionId);
  return {
    institutionName: institution?.name ?? "",
    state: institution?.state ?? "",
    region: institution?.region ?? "",
    city: institution?.city ?? "",
    campusType: "PERMANENT",
    totalStudentIntake: 0,
    facultyCount: 0,
    professorsCount: 0,
    associateProfessorsCount: 0,
    assistantProfessorsCount: 0,
    phdFacultyCount: 0,
    builtUpArea: institution?.builtUpAreaSqMeters ?? 0,
    landArea: institution?.landAreaSqMeters ?? 0,
    libraryVolumes: 0,
    labInvestmentLakhs: 0,
    programs: [],
    documents: [],
  };
}

function institutionDraft(session: SessionPayload): Application | null {
  const actor = actorFrom(session);
  if (!actor.institutionId) return null;
  const db = getDatabase();
  return (
    db.applications.find(
      (app) => app.institutionId === actor.institutionId && app.currentState === "DRAFT",
    ) ?? null
  );
}

export async function saveDraft(
  session: SessionPayload,
  formData: Partial<ApplicationFormData>,
  applicationId?: string,
): Promise<Application> {
  const actor = actorFrom(session);
  if (actor.role !== "INSTITUTION_USER" || !actor.institutionId) {
    throw new WorkflowError("Only institution users can draft applications.", 403, "FORBIDDEN");
  }
  const institution = findInstitution(actor.institutionId);
  if (!institution) {
    throw new WorkflowError("Institution profile is missing.", 422, "NO_INSTITUTION");
  }

  const existing = applicationId ? findApplication(applicationId) : institutionDraft(session);
  if (existing) {
    assertInstitutionAccess(actor, existing);
    if (existing.currentState !== "DRAFT" && existing.currentState !== "DEFICIENCY_NOTIFIED") {
      throw new WorkflowError(
        "This application can no longer be edited as a draft.",
        409,
        "LOCKED",
      );
    }
  }

  const base = existing?.formData ?? blankFormData(actor.institutionId);
  const clean = normalized({ ...base, ...formData });
  const evaluation = evaluateCompliance(clean);

  return mutateDatabase((db) => {
    let app = existing ? db.applications.find((item) => item.id === existing.id) : undefined;
    if (!app) {
      app = {
        id: randomUUID(),
        institutionId: institution.id,
        institution,
        academicYear: ACADEMIC_YEAR,
        currentState: "DRAFT",
        formData: clean,
        complianceScore: evaluation.score,
        slaDeadline: null,
        submittedAt: null,
        escalated: false,
        decisionNotes: null,
        deficiencies: [],
        auditLogs: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.applications.unshift(app);
      appendAudit(
        app,
        actor,
        "DRAFT",
        "DRAFT",
        "Draft application opened for academic year 2026-27.",
      );
    }

    app.formData = clean;
    app.complianceScore = evaluation.score;
    app.updatedAt = new Date().toISOString();
    institution.landAreaSqMeters = clean.landArea;
    institution.builtUpAreaSqMeters = clean.builtUpArea;
    return app;
  });
}

async function submitInternal(
  session: SessionPayload,
  formData: ApplicationFormData,
  applicationId: string | undefined,
  resubmission: boolean,
): Promise<Application> {
  const actor = actorFrom(session);
  if (actor.role !== "INSTITUTION_USER" || !actor.institutionId) {
    throw new WorkflowError("Only institution users can submit applications.", 403, "FORBIDDEN");
  }
  const institution = findInstitution(actor.institutionId);
  if (!institution) throw new WorkflowError("Institution profile is missing.", 422, "NO_INSTITUTION");

  const clean = normalized(formData);
  const evaluation = evaluateCompliance(clean);
  const now = new Date().toISOString();

  return mutateDatabase((db) => {
    let app: Application | undefined;
    if (resubmission) {
      app = db.applications.find((item) => item.id === applicationId);
      if (!app) throw new WorkflowError("Application not found.", 404, "NOT_FOUND");
      assertInstitutionAccess(actor, app);
      if (app.currentState !== "DEFICIENCY_NOTIFIED") {
        throw new WorkflowError(
          "Only applications with an open deficiency notice can be resubmitted.",
          409,
          "WRONG_STATE",
        );
      }
      validateStateTransition(app.currentState, "SUBMITTED", actor.role);
      app.deficiencies
        .filter((deficiency) => !deficiency.isResolved)
        .forEach((deficiency) => {
          deficiency.isResolved = true;
          deficiency.resolvedAt = now;
        });
    } else {
      app = applicationId
        ? db.applications.find((item) => item.id === applicationId)
        : db.applications.find(
            (item) =>
              item.institutionId === actor.institutionId && item.currentState === "DRAFT",
          );
      if (!app) {
        app = {
          id: randomUUID(),
          institutionId: institution.id,
          institution,
          academicYear: ACADEMIC_YEAR,
          currentState: "DRAFT",
          formData: clean,
          complianceScore: evaluation.score,
          slaDeadline: null,
          submittedAt: null,
          escalated: false,
          decisionNotes: null,
          deficiencies: [],
          auditLogs: [],
          createdAt: now,
          updatedAt: now,
        };
        db.applications.unshift(app);
        appendAudit(app, actor, "DRAFT", "DRAFT", "Application created and submitted.", true);
      }
      assertInstitutionAccess(actor, app);
      if (app.currentState !== "DRAFT") {
        throw new WorkflowError(
          "Only draft applications can be submitted. Use the deficiency desk to resubmit.",
          409,
          "WRONG_STATE",
        );
      }
      validateStateTransition("DRAFT", "SUBMITTED", actor.role);
    }

    app.formData = clean;
    app.complianceScore = evaluation.score;
    app.submittedAt = now;
    app.updatedAt = now;
    app.escalated = false;
    app.decisionNotes = null;
    app.currentState = "SUBMITTED";
    app.slaDeadline = addHours(SLA_HOURS.SUBMITTED ?? 48);
    institution.landAreaSqMeters = clean.landArea;
    institution.builtUpAreaSqMeters = clean.builtUpArea;

    appendAudit(
      app,
      actor,
      resubmission ? "DEFICIENCY_NOTIFIED" : "DRAFT",
      "SUBMITTED",
      resubmission
        ? "Corrected application resubmitted after deficiency remediation."
        : `Application submitted with ${evaluation.score}% compliance index.`,
    );

    if (!evaluation.isCompliant) {
      const deficiencies = buildDeficiencies(app, clean);
      app.deficiencies.push(...deficiencies);
      app.currentState = "RULE_VALIDATION_FAILED";
      appendAudit(
        app,
        actor,
        "SUBMITTED",
        "RULE_VALIDATION_FAILED",
        `Automated validation rejected ${evaluation.deficiencies.length} of ${evaluation.totalRules} handbook rules.`,
        true,
      );
      app.currentState = "DEFICIENCY_NOTIFIED";
      app.slaDeadline = addHours(SLA_HOURS.DEFICIENCY_NOTIFIED ?? REMEDIATION_HOURS);
      appendAudit(
        app,
        actor,
        "RULE_VALIDATION_FAILED",
        "DEFICIENCY_NOTIFIED",
        "Show-cause notice issued with a 7-day remediation window.",
        true,
      );
      emitEvent({
        type: "DEFICIENCY_RAISED",
        title: "Deficiency notice issued",
        message: `${institution.name}: ${deficiencies.length} rule gap(s) require remediation before ${new Date(
          app.slaDeadline,
        ).toLocaleDateString("en-IN")}.`,
        applicationId: app.id,
        severity: "WARNING",
      });
    } else {
      emitEvent({
        type: "APPLICATION_SUBMITTED",
        title: resubmission ? "Application resubmitted" : "New application received",
        message: `${institution.name} cleared all ${evaluation.totalRules} automated checks at ${evaluation.score}%.`,
        applicationId: app.id,
        severity: "INFO",
      });
    }

    return app;
  });
}

export function submitApplication(
  session: SessionPayload,
  formData: ApplicationFormData,
  applicationId?: string,
): Promise<Application> {
  return submitInternal(session, formData, applicationId, false);
}

export function resubmitApplication(
  session: SessionPayload,
  applicationId: string,
  formData: ApplicationFormData,
): Promise<Application> {
  return submitInternal(session, formData, applicationId, true);
}

export interface TransitionInput {
  target: ApplicationState;
  notes?: string;
}

export async function transitionApplication(
  session: SessionPayload,
  applicationId: string,
  input: TransitionInput,
): Promise<Application> {
  const actor = actorFrom(session);
  if (actor.role === "INSTITUTION_USER") {
    throw new WorkflowError(
      "Institutions cannot advance workflow stages directly.",
      403,
      "FORBIDDEN",
    );
  }

  return mutateDatabase((db) => {
    const app = db.applications.find((item) => item.id === applicationId);
    if (!app) throw new WorkflowError("Application not found.", 404, "NOT_FOUND");
    // Scope is checked before the state machine so a denied caller learns nothing about the record.
    assertInScope(session, app);

    validateStateTransition(app.currentState, input.target, actor.role);
    const previous = app.currentState;
    const notes = input.notes?.trim() || defaultNote(input.target);

    if (input.target === "DEFICIENCY_NOTIFIED") {
      const additions = buildDeficiencies(app, app.formData);
      app.deficiencies.push(...additions);
    }

    if (input.target === "APPROVED" || input.target === "REJECTED") {
      app.deficiencies
        .filter((deficiency) => !deficiency.isResolved)
        .forEach((deficiency) => {
          deficiency.isResolved = true;
          deficiency.resolvedAt = new Date().toISOString();
        });
      app.decisionNotes = notes;
    }

    app.currentState = input.target;
    app.updatedAt = new Date().toISOString();
    app.escalated = false;

    const slaHours = SLA_HOURS[input.target];
    app.slaDeadline =
      input.target === "APPROVED" || input.target === "REJECTED"
        ? null
        : slaHours
          ? addHours(slaHours)
          : app.slaDeadline;

    appendAudit(app, actor, previous, input.target, notes);

    if (input.target === "APPROVED" || input.target === "REJECTED") {
      emitEvent({
        type: input.target === "APPROVED" ? "APPLICATION_APPROVED" : "STATE_CHANGED",
        title:
          input.target === "APPROVED"
            ? "Institution approved"
            : "Application rejected",
        message: `${app.institution.name} · ${notes}`,
        applicationId: app.id,
        severity: input.target === "APPROVED" ? "SUCCESS" : "CRITICAL",
      });
    } else {
      emitEvent({
        type: "STATE_CHANGED",
        title: `Moved to ${STATE_META[input.target].label}`,
        message: `${app.institution.name} · ${notes}`,
        applicationId: app.id,
        severity: "INFO",
      });
    }

    return app;
  });
}

function defaultNote(target: ApplicationState): string {
  switch (target) {
    case "UNDER_SCRUTINY":
      return "Application claimed for document scrutiny.";
    case "DEFICIENCY_NOTIFIED":
      return "Deficiency flagged after manual document audit.";
    case "EVC_INSPECTION":
      return "Scrutiny cleared. Expert Visit Committee inspection scheduled.";
    case "APPROVED":
      return "Approved after EVC verification.";
    case "REJECTED":
      return "Rejected after EVC verification.";
    case "SUBMITTED":
      return "Application submitted.";
    default:
      return "Workflow updated.";
  }
}

export async function resolveDeficiency(
  session: SessionPayload,
  applicationId: string,
  deficiencyId: string,
  resolved: boolean,
): Promise<Application> {
  const actor = actorFrom(session);
  if (actor.role !== "INSTITUTION_USER") {
    throw new WorkflowError("Only institutions can resolve their deficiencies.", 403, "FORBIDDEN");
  }

  return mutateDatabase((db) => {
    const app = db.applications.find((item) => item.id === applicationId);
    if (!app) throw new WorkflowError("Application not found.", 404, "NOT_FOUND");
    assertInstitutionAccess(actor, app);
    const deficiency = app.deficiencies.find((item) => item.id === deficiencyId);
    if (!deficiency) throw new WorkflowError("Deficiency not found.", 404, "NOT_FOUND");
    deficiency.isResolved = resolved;
    deficiency.resolvedAt = resolved ? new Date().toISOString() : null;
    app.updatedAt = new Date().toISOString();
    return app;
  });
}

export function institutionApplications(session: SessionPayload): Application[] {
  return listApplications(session);
}

export function pipelineSnapshot(session: SessionPayload): {
  byState: Record<string, number>;
  overdue: Application[];
} {
  const applications = scopedApplications(resolveScope(session));
  const byState: Record<string, number> = {};
  for (const app of applications) {
    byState[app.currentState] = (byState[app.currentState] ?? 0) + 1;
  }
  return {
    byState,
    overdue: applications.filter(
      (app) =>
        app.escalated &&
        app.currentState !== "APPROVED" &&
        app.currentState !== "REJECTED",
    ),
  };
}
