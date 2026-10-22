import type { ApplicationState, Role } from "@aicte/shared";

export class StateTransitionError extends Error {
  readonly code: string;

  constructor(message: string, code = "INVALID_TRANSITION") {
    super(message);
    this.name = "StateTransitionError";
    this.code = code;
  }
}

/** Every legal edge in the AICTE approval workflow. */
export const ALLOWED_TRANSITIONS: Record<ApplicationState, ApplicationState[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_SCRUTINY", "RULE_VALIDATION_FAILED"],
  RULE_VALIDATION_FAILED: ["DEFICIENCY_NOTIFIED"],
  DEFICIENCY_NOTIFIED: ["SUBMITTED"],
  UNDER_SCRUTINY: ["EVC_INSPECTION", "DEFICIENCY_NOTIFIED"],
  EVC_INSPECTION: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

/** States each role is allowed to move an application into. */
const ROLE_TARGETS: Record<Role, ApplicationState[]> = {
  INSTITUTION_USER: ["SUBMITTED"],
  SCRUTINY_MEMBER: [
    "UNDER_SCRUTINY",
    "RULE_VALIDATION_FAILED",
    "DEFICIENCY_NOTIFIED",
    "EVC_INSPECTION",
    "APPROVED",
    "REJECTED",
  ],
  REGIONAL_OFFICER: ["EVC_INSPECTION", "DEFICIENCY_NOTIFIED"],
  AICTE_ADMIN: [
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "RULE_VALIDATION_FAILED",
    "DEFICIENCY_NOTIFIED",
    "EVC_INSPECTION",
    "APPROVED",
    "REJECTED",
  ],
};

const FINAL_DECISION_ROLES: Role[] = ["AICTE_ADMIN", "SCRUTINY_MEMBER"];

export function allowedTargetsFor(
  currentState: ApplicationState,
  role: Role,
): ApplicationState[] {
  return ALLOWED_TRANSITIONS[currentState].filter((target) =>
    ROLE_TARGETS[role].includes(target),
  );
}

/**
 * Validates the workflow edge plus the actor's role-based permission.
 * Throws StateTransitionError with a machine-readable code on failure.
 */
export function validateStateTransition(
  currentState: ApplicationState,
  targetState: ApplicationState,
  actorRole: Role,
): true {
  if (!ALLOWED_TRANSITIONS[currentState].includes(targetState)) {
    throw new StateTransitionError(
      `Invalid transition: cannot move from ${currentState} to ${targetState}.`,
      "ILLEGAL_EDGE",
    );
  }

  if (targetState === "APPROVED" || targetState === "REJECTED") {
    if (!FINAL_DECISION_ROLES.includes(actorRole)) {
      throw new StateTransitionError(
        "Only the Scrutiny Desk and AICTE Admins can issue final decisions.",
        "FORBIDDEN_ROLE",
      );
    }
  }

  if (!ROLE_TARGETS[actorRole].includes(targetState)) {
    throw new StateTransitionError(
      `Role ${actorRole} cannot move an application to ${targetState}.`,
      "FORBIDDEN_ROLE",
    );
  }

  return true;
}

export function isFinalDecision(state: ApplicationState): boolean {
  return state === "APPROVED" || state === "REJECTED";
}

export function canRoleAct(
  currentState: ApplicationState,
  role: Role,
): boolean {
  return allowedTargetsFor(currentState, role).length > 0;
}
