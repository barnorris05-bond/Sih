import ruleBookJson from "../rules/aphRules.json";
import type {
  ApplicationFormData,
  DeficiencyDraft,
  RuleBook,
  RuleCheck,
  RuleEvaluationResult,
  Severity,
} from "./types";

const ruleBook = ruleBookJson as unknown as RuleBook;

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function ruleByCode(code: string) {
  const found = ruleBook.rules.find((rule) => rule.code === code);
  if (!found) throw new Error(`Unknown handbook rule: ${code}`);
  return found;
}

function numericThreshold(code: string): number {
  const value = ruleByCode(code).thresholdValue;
  return typeof value === "number" ? value : 0;
}

/** Faculty required for the declared intake, honouring accredited programme ratios. */
export function requiredFacultyFor(formData: Partial<ApplicationFormData>): number {
  const students = toNumber(formData.totalStudentIntake);
  const accredited = formData.programs?.some((program) => program.accredited) ?? false;
  const rule = ruleByCode("APH_2026_SFR");
  const ratio = accredited
    ? rule.accreditedThresholdValue ?? 15
    : typeof rule.thresholdValue === "number"
      ? rule.thresholdValue
      : 20;
  return Math.ceil(students / ratio);
}

function buildCheck(
  code: string,
  passed: boolean,
  requiredValue: string,
  actualValue: string,
): RuleCheck {
  const rule = ruleByCode(code);
  return {
    code,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    weight: rule.weight,
    passed,
    requiredValue,
    actualValue,
    description: rule.description,
    remediation: rule.remediation,
  };
}

/**
 * Pure, side-effect free evaluation of the AICTE Approval Process Handbook
 * constraints. Safe to run on every keystroke in the application wizard.
 */
export function evaluateCompliance(
  formData: Partial<ApplicationFormData>,
  landAreaOverride?: number,
): RuleEvaluationResult {
  const students = toNumber(formData.totalStudentIntake);
  const faculty = toNumber(formData.facultyCount);
  const professors = toNumber(formData.professorsCount);
  const associate = toNumber(formData.associateProfessorsCount);
  const assistant = toNumber(formData.assistantProfessorsCount);
  const phd = Math.min(
    toNumber(formData.phdFacultyCount),
    faculty || toNumber(formData.phdFacultyCount),
  );
  const builtUp = toNumber(formData.builtUpArea);
  const land =
    landAreaOverride !== undefined ? toNumber(landAreaOverride) : toNumber(formData.landArea);
  const volumes = toNumber(formData.libraryVolumes);
  const accredited = formData.programs?.some((program) => program.accredited) ?? false;

  const sfrRule = ruleByCode("APH_2026_SFR");
  const ratio = accredited
    ? sfrRule.accreditedThresholdValue ?? 15
    : typeof sfrRule.thresholdValue === "number"
      ? sfrRule.thresholdValue
      : 20;
  const requiredFaculty = Math.ceil(students / ratio);
  const servedRatio =
    faculty > 0 && students > 0 ? Math.round((students / faculty) * 10) / 10 : 0;

  const checks: RuleCheck[] = [];

  checks.push(
    buildCheck(
      "APH_2026_SFR",
      students > 0 && faculty >= requiredFaculty,
      `${requiredFaculty} full-time faculty (1:${ratio})`,
      faculty > 0 ? `${faculty} faculty (1:${servedRatio})` : "No faculty declared",
    ),
  );

  const requiredProfessors = Math.ceil(faculty / 9);
  const requiredAssociate = Math.ceil((faculty * 2) / 9);
  const cadreDeclared = professors + associate + assistant;
  const cadrePassed =
    faculty > 0 &&
    professors >= requiredProfessors &&
    associate >= requiredAssociate &&
    cadreDeclared >= faculty;

  checks.push(
    buildCheck(
      "APH_2026_CADRE",
      cadrePassed,
      `≥ ${requiredProfessors} Professors · ≥ ${requiredAssociate} Associate Professors`,
      `${professors} Professors · ${associate} Associate · ${assistant} Assistant`,
    ),
  );

  const requiredBuiltUp = Math.ceil(students * numericThreshold("APH_2026_INFRA"));
  checks.push(
    buildCheck(
      "APH_2026_INFRA",
      builtUp >= requiredBuiltUp && students > 0,
      `${requiredBuiltUp.toLocaleString("en-IN")} sq.m instructional area`,
      `${builtUp.toLocaleString("en-IN")} sq.m declared`,
    ),
  );

  const requiredLand = numericThreshold("APH_2026_LAND");
  checks.push(
    buildCheck(
      "APH_2026_LAND",
      land >= requiredLand,
      `${requiredLand.toLocaleString("en-IN")} sq.m contiguous campus`,
      `${land.toLocaleString("en-IN")} sq.m declared`,
    ),
  );

  const phdShare = faculty > 0 ? phd / faculty : 0;
  const requiredPhdShare = numericThreshold("APH_2026_PHD");
  checks.push(
    buildCheck(
      "APH_2026_PHD",
      phdShare >= requiredPhdShare,
      `${Math.round(requiredPhdShare * 100)}% doctoral faculty (${Math.ceil(
        requiredPhdShare * faculty,
      )} members)`,
      `${phd} of ${faculty} faculty (${Math.round(phdShare * 100)}%)`,
    ),
  );

  const requiredVolumes = students * numericThreshold("APH_2026_LIBRARY");
  checks.push(
    buildCheck(
      "APH_2026_LIBRARY",
      volumes >= requiredVolumes && students > 0,
      `${requiredVolumes.toLocaleString("en-IN")} volumes`,
      `${volumes.toLocaleString("en-IN")} volumes catalogued`,
    ),
  );

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const passedWeight = checks
    .filter((check) => check.passed)
    .reduce((sum, check) => sum + check.weight, 0);
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;

  const deficiencies: DeficiencyDraft[] = checks
    .filter((check) => !check.passed)
    .map((check) => ({
      ruleCode: check.code,
      title: check.title,
      severity: check.severity,
      requiredValue: check.requiredValue,
      actualValue: check.actualValue,
      description: check.description,
    }));

  return {
    score,
    isCompliant: deficiencies.length === 0,
    totalRules: checks.length,
    passedRules: checks.filter((check) => check.passed).length,
    deficiencies,
    checks,
  };
}

export function complianceBand(score: number): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (score >= 90) return { label: "Approval ready", tone: "success" };
  if (score >= 65) return { label: "Needs remediation", tone: "warning" };
  return { label: "Critical gaps", tone: "danger" };
}

export function severityRank(severity: Severity): number {
  return { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }[severity];
}
