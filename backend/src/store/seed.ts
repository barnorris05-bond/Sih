import type {
  Application,
  ApplicationDocument,
  ApplicationFormData,
  ApplicationState,
  AuditLog,
  Deficiency,
  Institution,
  PlatformEvent,
  Program,
  Role,
  Severity,
} from "@aicte/shared";
import { ACADEMIC_YEAR, REMEDIATION_HOURS, SLA_HOURS, STATES_BY_REGION } from "@aicte/shared";
import { demoPassword } from "../config/env";
import { hashPassword } from "../auth/password";
import { evaluateCompliance, requiredFacultyFor } from "../engines/ruleEngine";
import type { DatabaseShape, UserRecord } from "./database";

/* -------------------------------------------------------------------------- */
/*  Deterministic pseudo-random helpers                                        */
/* -------------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20262);

function int(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error("Cannot pick from an empty list");
  return item;
}

const now = Date.now();

function iso(offsetMs: number): string {
  return new Date(now + offsetMs).toISOString();
}

function isoDaysAgo(days: number): string {
  return iso(-days * 24 * 60 * 60 * 1000);
}

function isoHoursFromNow(hoursAhead: number): string {
  return iso(hoursAhead * 60 * 60 * 1000);
}

/* -------------------------------------------------------------------------- */
/*  Institution catalogue                                                       */
/* -------------------------------------------------------------------------- */

const CITIES: Record<string, string[]> = {
  Delhi: ["New Delhi", "Dwarka"],
  Haryana: ["Gurugram", "Faridabad"],
  Punjab: ["Ludhiana", "Amritsar"],
  "Uttar Pradesh": ["Noida", "Lucknow", "Kanpur"],
  Uttarakhand: ["Dehradun"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Kerala: ["Kochi", "Thiruvananthapuram"],
  Telangana: ["Hyderabad", "Warangal"],
  "Andhra Pradesh": ["Vijayawada", "Visakhapatnam"],
  "West Bengal": ["Kolkata", "Siliguri"],
  Odisha: ["Bhubaneswar", "Rourkela"],
  Bihar: ["Patna"],
  Jharkhand: ["Ranchi"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur"],
  Gujarat: ["Ahmedabad", "Surat"],
  Rajasthan: ["Jaipur", "Jodhpur"],
  Goa: ["Panaji"],
  "Madhya Pradesh": ["Bhopal", "Indore"],
  Chhattisgarh: ["Raipur"],
  Assam: ["Guwahati"],
  Meghalaya: ["Shillong"],
  Manipur: ["Imphal"],
  Tripura: ["Agartala"],
};

const PREFIXES = [
  "Sunrise",
  "Sundar",
  "National",
  "Nova",
  "Apex",
  "Sterling",
  "Ganga",
  "Vidya",
  "Saraswati",
  "Blue Ridge",
  "Meridian",
  "Orion",
  "Crescent",
  "Pinnacle",
  "Horizon",
  "Indus",
  "Kaveri",
  "Trinity",
  "Vishwakarma",
  "Aditya",
  "Bharat",
  "Chaitanya",
  "Deccan",
  "Everest",
] as const;

const SUFFIXES = [
  "Institute of Technology",
  "College of Engineering",
  "Institute of Management",
  "School of Computing",
  "Polytechnic Institute",
] as const;

function regionForState(state: string): string {
  for (const [region, states] of Object.entries(STATES_BY_REGION)) {
    if (states.includes(state)) return region;
  }
  return "Central";
}

function buildInstitutions(): Institution[] {
  const states = Object.values(STATES_BY_REGION).flat();
  return Array.from({ length: 24 }, (_, index) => {
    const state = states[index % states.length] ?? "Delhi";
    const cityChoices = CITIES[state] ?? [state];
    const name = `${PREFIXES[index % PREFIXES.length]} ${
      SUFFIXES[index % SUFFIXES.length]
    }`;
    return {
      id: `inst-${String(index + 1).padStart(2, "0")}`,
      aicteCode: `1-${10293846 + index * 137}`,
      name: index === 0 ? "Sundar Institute of Technology" : name,
      state,
      region: regionForState(state),
      city: cityChoices[index % cityChoices.length] ?? state,
      landAreaSqMeters: int(9, 22) * 1000,
      builtUpAreaSqMeters: int(12, 40) * 1000,
      createdAt: isoDaysAgo(int(400, 1400)),
    };
  });
}

/* -------------------------------------------------------------------------- */
/*  Form payload builders                                                       */
/* -------------------------------------------------------------------------- */

function buildPrograms(students: number, accredited: boolean): Program[] {
  const count = int(2, 4);
  const base = Math.floor(students / count);
  const remainder = students - base * count;
  const degrees: Program["degree"][] = ["B.Tech", "M.Tech", "MBA", "MCA"];
  return Array.from({ length: count }, (_, index) => ({
    id: `prog-${index + 1}`,
    name:
      ["Computer Science & Engineering", "Electronics & Communication", "Mechanical Engineering", "Information Technology", "Artificial Intelligence & Data Science", "Business Administration"][
        index % 6
      ] ?? "Computer Science & Engineering",
    degree: degrees[index % degrees.length] ?? "B.Tech",
    intake: base + (index === 0 ? remainder : 0),
    accredited: accredited && index === 0,
  }));
}

function buildDocuments(): ApplicationDocument[] {
  return [
    {
      id: "doc-land",
      name: "Registered Land Deed",
      category: "LAND",
      fileName: "land-deed-registered.pdf",
      sizeKb: int(820, 2400),
      verified: true,
    },
    {
      id: "doc-faculty",
      name: "Faculty Appointment Register",
      category: "FACULTY",
      fileName: "faculty-register-2026.pdf",
      sizeKb: int(420, 980),
      verified: true,
    },
    {
      id: "doc-affiliation",
      name: "University Affiliation Letter",
      category: "AFFILIATION",
      fileName: "affiliation-letter.pdf",
      sizeKb: int(180, 540),
      verified: true,
    },
    {
      id: "doc-finance",
      name: "Audited Financial Statement",
      category: "FINANCE",
      fileName: "financials-fy26.pdf",
      sizeKb: int(600, 1800),
      verified: false,
    },
    {
      id: "doc-infra",
      name: "Infrastructure Photographic Evidence",
      category: "INFRASTRUCTURE",
      fileName: "campus-infrastructure.zip",
      sizeKb: int(2400, 8200),
      verified: false,
    },
  ];
}

type Violation = "SFR" | "CADRE" | "INFRA" | "LAND" | "PHD" | "LIBRARY";

function buildFormData(
  institution: Institution,
  options: { accredited: boolean; violation?: Violation },
): ApplicationFormData {
  const totalStudentIntake = int(300, 960);
  const programs = buildPrograms(totalStudentIntake, options.accredited);

  const baseline: ApplicationFormData = {
    institutionName: institution.name,
    state: institution.state,
    region: institution.region,
    city: institution.city,
    campusType: "PERMANENT",
    totalStudentIntake,
    facultyCount: 0,
    professorsCount: 0,
    associateProfessorsCount: 0,
    assistantProfessorsCount: 0,
    phdFacultyCount: 0,
    builtUpArea: Math.ceil(totalStudentIntake * 2.5) + int(600, 2600),
    landArea: int(9, 18) * 1000,
    libraryVolumes: totalStudentIntake * int(13, 20),
    labInvestmentLakhs: int(120, 480),
    programs,
    documents: buildDocuments(),
  };

  const requiredFaculty = requiredFacultyFor(baseline);
  baseline.facultyCount =
    options.violation === "SFR" ? Math.floor(totalStudentIntake / 30) : requiredFaculty + int(2, 9);

  const faculty = baseline.facultyCount;
  const professors = Math.ceil(faculty / 9) + int(0, 1);
  const associate = Math.ceil((faculty * 2) / 9) + int(0, 1);
  baseline.professorsCount = professors;
  baseline.associateProfessorsCount = associate;
  baseline.assistantProfessorsCount = Math.max(0, faculty - professors - associate);
  baseline.phdFacultyCount = Math.ceil(faculty * 0.5) + int(0, 3);

  switch (options.violation) {
    case "CADRE":
      baseline.professorsCount = Math.max(0, Math.floor(faculty / 18));
      baseline.associateProfessorsCount = Math.max(1, Math.floor(faculty / 12));
      baseline.assistantProfessorsCount =
        faculty - baseline.professorsCount - baseline.associateProfessorsCount;
      break;
    case "INFRA":
      baseline.builtUpArea = Math.floor(totalStudentIntake * 1.7);
      break;
    case "LAND":
      baseline.landArea = 5200;
      break;
    case "PHD":
      baseline.phdFacultyCount = Math.max(1, Math.floor(faculty * 0.1));
      break;
    case "LIBRARY":
      baseline.libraryVolumes = totalStudentIntake * 4;
      break;
    default:
      break;
  }

  return baseline;
}

/* -------------------------------------------------------------------------- */
/*  Workflow scaffolding                                                        */
/* -------------------------------------------------------------------------- */

const STATE_PLAN: ApplicationState[] = [
  ...Array<ApplicationState>(18).fill("APPROVED"),
  ...Array<ApplicationState>(10).fill("UNDER_SCRUTINY"),
  ...Array<ApplicationState>(2).fill("REJECTED"),
  ...Array<ApplicationState>(2).fill("EVC_INSPECTION"),
  "SUBMITTED",
  "DRAFT",
  "RULE_VALIDATION_FAILED",
  ...Array<ApplicationState>(15).fill("DEFICIENCY_NOTIFIED"),
];

/** Five applications are deliberately past their SLA to exercise escalation. */
const OVERDUE_APPLICATION_NUMBERS = new Set([23, 26, 31, 33, 38]);

const VIOLATIONS: Violation[] = ["SFR", "CADRE", "INFRA", "LAND", "PHD", "LIBRARY"];

interface Actor {
  id: string;
  name: string;
  role: Role;
}

const ACTORS: Record<"institution" | "reviewer" | "admin", Actor> = {
  institution: { id: "usr-inst-01", name: "Dr. Meera Rajan", role: "INSTITUTION_USER" },
  reviewer: { id: "usr-reviewer", name: "Arun Deshpande", role: "SCRUTINY_MEMBER" },
  admin: { id: "usr-admin", name: "R. Venkatesan", role: "AICTE_ADMIN" },
};

function makeAudit(
  applicationId: string,
  index: number,
  actor: Actor,
  previousState: ApplicationState,
  newState: ApplicationState,
  notes: string,
  daysAgo: number,
  automated = false,
): AuditLog {
  return {
    id: `aud-${applicationId}-${index}`,
    applicationId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    previousState,
    newState,
    actionNotes: notes,
    automated,
    timestamp: isoDaysAgo(daysAgo),
  };
}

function makeDeficiency(
  applicationId: string,
  index: number,
  ruleCode: string,
  title: string,
  severity: Severity,
  description: string,
  requiredValue: string,
  actualValue: string,
  deadline: string,
): Deficiency {
  return {
    id: `def-${applicationId}-${index}`,
    applicationId,
    ruleCode,
    severity,
    title,
    description,
    requiredValue,
    actualValue,
    remediationDeadline: deadline,
    isResolved: false,
    createdAt: isoDaysAgo(int(2, 8)),
    resolvedAt: null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Database builder                                                            */
/* -------------------------------------------------------------------------- */

export function createSeedDatabase(): DatabaseShape {
  const institutions = buildInstitutions();
  const passwordHash = hashPassword(demoPassword);

  const users: UserRecord[] = [
    {
      id: "usr-inst-01",
      email: "institution@aicte.demo",
      name: "Dr. Meera Rajan",
      role: "INSTITUTION_USER",
      institutionId: institutions[0]?.id ?? null,
      createdAt: isoDaysAgo(320),
      passwordHash,
    },
    {
      id: "usr-reviewer",
      email: "reviewer@aicte.demo",
      name: "Arun Deshpande",
      role: "SCRUTINY_MEMBER",
      institutionId: null,
      createdAt: isoDaysAgo(280),
      passwordHash,
    },
    {
      id: "usr-officer",
      email: "officer@aicte.demo",
      name: "Kavita Nair",
      role: "REGIONAL_OFFICER",
      institutionId: null,
      // Demo fixture: the officer covers the region of the demo institution (index 0). Real
      // assignments are an operational decision; see the regional-scope notes in the README.
      region: institutions[0]?.region ?? null,
      createdAt: isoDaysAgo(260),
      passwordHash,
    },
    {
      id: "usr-admin",
      email: "admin@aicte.demo",
      name: "R. Venkatesan",
      role: "AICTE_ADMIN",
      institutionId: null,
      createdAt: isoDaysAgo(240),
      passwordHash,
    },
  ];

  const applications: Application[] = [];
  const events: PlatformEvent[] = [];

  STATE_PLAN.forEach((state, index) => {
    // Coprime stride spreads filings across states so the heatmap shows a mix
    // of outcomes rather than 100%/0% buckets, while keeping the demo tenant
    // (indices 0-3) attached to the signed-in institution account.
    const institution =
      index < 4
        ? institutions[0]
        : institutions[(index * 7) % institutions.length];
    if (!institution) return;

    const applicationId = `app-${String(index + 1).padStart(3, "0")}`;
    const deficient =
      state === "DEFICIENCY_NOTIFIED" ||
      state === "RULE_VALIDATION_FAILED" ||
      state === "REJECTED";
    // Rejected files carry the land-record failure referenced in their audit notes;
    // other deficient files cycle through the rule set for coverage.
    const violation =
      state === "REJECTED"
        ? "LAND"
        : deficient
          ? VIOLATIONS[index % VIOLATIONS.length]
          : undefined;
    const accredited = index % 3 === 0;
    const formData = buildFormData(institution, { accredited, violation });
    const evaluation = evaluateCompliance(formData);

    const createdDaysAgo = int(12, 95) + (index < 4 ? 0 : 0);
    const submittedDaysAgo = Math.max(1, createdDaysAgo - int(1, 4));
    const isOverdue = OVERDUE_APPLICATION_NUMBERS.has(index + 1);
    let slaDeadline: string | null = null;

    if (state !== "DRAFT" && state !== "APPROVED" && state !== "REJECTED") {
      const slaHours = SLA_HOURS[state] ?? 72;
      slaDeadline = isOverdue
        ? isoHoursFromNow(-int(6, 120))
        : isoHoursFromNow(int(3, slaHours));
    }

    const auditLogs: AuditLog[] = [
      makeAudit(
        applicationId,
        0,
        ACTORS.institution,
        "DRAFT",
        "DRAFT",
        "Application created for academic year 2026-27.",
        createdDaysAgo,
      ),
    ];

    let cursor = 0;
    const pushAudit = (
      previous: ApplicationState,
      next: ApplicationState,
      notes: string,
      days: number,
      actor: Actor = ACTORS.institution,
      automated = false,
    ) => {
      cursor += 1;
      auditLogs.push(
        makeAudit(applicationId, cursor, actor, previous, next, notes, days, automated),
      );
    };

    if (state !== "DRAFT") {
      pushAudit(
        "DRAFT",
        "SUBMITTED",
        "Application submitted with self-certified declarations.",
        submittedDaysAgo,
      );
    }
    if (
      state === "RULE_VALIDATION_FAILED" ||
      state === "DEFICIENCY_NOTIFIED" ||
      state === "UNDER_SCRUTINY" ||
      state === "EVC_INSPECTION" ||
      state === "APPROVED" ||
      state === "REJECTED"
    ) {
      const validationNotes = evaluation.isCompliant
        ? `Automated validation cleared all ${evaluation.totalRules} handbook rules.`
        : `Automated validation failed ${evaluation.deficiencies.length} rule(s).`;
      pushAudit(
        "SUBMITTED",
        "UNDER_SCRUTINY",
        validationNotes,
        Math.max(1, submittedDaysAgo - 1),
        ACTORS.reviewer,
        true,
      );
    }
    if (state === "DEFICIENCY_NOTIFIED" || state === "RULE_VALIDATION_FAILED") {
      if (state === "DEFICIENCY_NOTIFIED") {
        pushAudit(
          "UNDER_SCRUTINY",
          "DEFICIENCY_NOTIFIED",
          "Show-cause issued for unmet statutory requirements.",
          Math.max(1, submittedDaysAgo - 2),
          ACTORS.reviewer,
        );
      }
    }
    if (
      state === "EVC_INSPECTION" ||
      state === "APPROVED" ||
      state === "REJECTED"
    ) {
      pushAudit(
        "UNDER_SCRUTINY",
        "EVC_INSPECTION",
        "Expert Visit Committee scheduled for physical verification.",
        Math.max(1, submittedDaysAgo - 3),
        ACTORS.reviewer,
      );
    }
    if (state === "APPROVED") {
      pushAudit(
        "EVC_INSPECTION",
        "APPROVED",
        "Approval letter issued after EVC clearance.",
        Math.max(1, submittedDaysAgo - 5),
        ACTORS.admin,
      );
    }
    if (state === "REJECTED") {
      pushAudit(
        "EVC_INSPECTION",
        "REJECTED",
        "Rejected: unverifiable land records and unresolved faculty shortage.",
        Math.max(1, submittedDaysAgo - 5),
        ACTORS.admin,
      );
    }

    if (isOverdue && slaDeadline) {
      cursor += 1;
      auditLogs.push(
        makeAudit(
          applicationId,
          cursor,
          ACTORS.reviewer,
          state,
          state,
          "SLA breached — auto-escalated to Regional Officer.",
          int(1, 5),
          true,
        ),
      );
    }

    const deficiencies: Deficiency[] =
      state === "DEFICIENCY_NOTIFIED" || state === "RULE_VALIDATION_FAILED"
        ? evaluation.deficiencies.map((item, defIndex) =>
            makeDeficiency(
              applicationId,
              defIndex,
              item.ruleCode,
              item.title,
              item.severity,
              item.description,
              item.requiredValue,
              item.actualValue,
              isOverdue
                ? isoHoursFromNow(-int(4, 72))
                : isoHoursFromNow(REMEDIATION_HOURS - int(0, 48)),
            ),
          )
        : [];

    const submittedAt =
      state === "DRAFT" ? null : isoDaysAgo(submittedDaysAgo);

    applications.push({
      id: applicationId,
      institutionId: institution.id,
      institution,
      academicYear: ACADEMIC_YEAR,
      currentState: state,
      formData,
      complianceScore: evaluation.score,
      slaDeadline,
      submittedAt,
      escalated: isOverdue,
      decisionNotes:
        state === "APPROVED"
          ? "Approved with intake as declared. Valid until 31 March 2027."
          : state === "REJECTED"
            ? "Rejected by the Expert Visit Committee."
            : null,
      deficiencies,
      auditLogs,
      createdAt: isoDaysAgo(createdDaysAgo),
      updatedAt: isoDaysAgo(int(0, 4)),
    });

    const latestAudit = auditLogs[auditLogs.length - 1];
    if (latestAudit) {
      events.push({
        id: `evt-${applicationId}`,
        type:
          state === "APPROVED"
            ? "APPLICATION_APPROVED"
            : state === "DEFICIENCY_NOTIFIED"
              ? "DEFICIENCY_RAISED"
              : "STATE_CHANGED",
        title:
          state === "APPROVED"
            ? "Approval issued"
            : state === "DEFICIENCY_NOTIFIED"
              ? "Deficiency notified"
              : "Workflow updated",
        message: `${institution.name} · ${latestAudit.actionNotes}`,
        applicationId,
        severity:
          state === "APPROVED"
            ? "SUCCESS"
            : state === "DEFICIENCY_NOTIFIED"
              ? "WARNING"
              : "INFO",
        timestamp: latestAudit.timestamp,
      });
    }

    if (isOverdue) {
      events.push({
        id: `evt-sla-${applicationId}`,
        type: "SLA_BREACHED",
        title: "SLA breached",
        message: `${institution.name} exceeded the ${state.replaceAll("_", " ").toLowerCase()} window. Auto-escalated.`,
        applicationId,
        severity: "CRITICAL",
        timestamp: isoHoursFromNow(-int(2, 20)),
      });
    }
  });

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    version: 1,
    seededAt: new Date().toISOString(),
    users,
    institutions,
    applications,
    events: events.slice(0, 60),
  };
}
