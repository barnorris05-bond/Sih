import {
  APPLICATION_STATES,
  ruleBook,
  STATE_META,
  type AnalyticsSnapshot,
  type Application,
  type ApplicationState,
  type RegionDistribution,
  type Severity,
  type SlaBucket,
  type StateDistribution,
} from "@aicte/shared";
import { getDatabase } from "../store/database";

const DECIDED: ApplicationState[] = ["APPROVED", "REJECTED"];
const ACTIVE: ApplicationState[] = [
  "SUBMITTED",
  "UNDER_SCRUTINY",
  "EVC_INSPECTION",
  "DEFICIENCY_NOTIFIED",
];

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value =
    sorted.length % 2 === 0
      ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
      : (sorted[middle] ?? 0);
  return round(value);
}

function buildStateDistribution(applications: Application[]): StateDistribution[] {
  const byState = new Map<string, StateDistribution>();
  for (const application of applications) {
    const state = application.institution.state;
    const existing =
      byState.get(state) ??
      ({
        state,
        region: application.institution.region,
        total: 0,
        approved: 0,
        deficient: 0,
        pending: 0,
        approvalRate: 0,
        averageCompliance: 0,
      } satisfies StateDistribution);
    existing.total += 1;
    if (application.currentState === "APPROVED") existing.approved += 1;
    if (
      application.currentState === "DEFICIENCY_NOTIFIED" ||
      application.currentState === "RULE_VALIDATION_FAILED"
    ) {
      existing.deficient += 1;
    }
    if (ACTIVE.includes(application.currentState)) existing.pending += 1;
    existing.averageCompliance += application.complianceScore;
    byState.set(state, existing);
  }

  return [...byState.values()]
    .map((entry) => ({
      ...entry,
      approvalRate: entry.total > 0 ? Math.round((entry.approved / entry.total) * 100) : 0,
      averageCompliance: round(entry.averageCompliance / entry.total),
    }))
    .sort((a, b) => b.total - a.total);
}

function buildRegionDistribution(applications: Application[]): RegionDistribution[] {
  const byRegion = new Map<string, RegionDistribution>();
  for (const application of applications) {
    const region = application.institution.region;
    const existing =
      byRegion.get(region) ??
      ({ region, total: 0, approved: 0, rejected: 0, pending: 0 } satisfies RegionDistribution);
    existing.total += 1;
    if (application.currentState === "APPROVED") existing.approved += 1;
    if (application.currentState === "REJECTED") existing.rejected += 1;
    if (ACTIVE.includes(application.currentState)) existing.pending += 1;
    byRegion.set(region, existing);
  }
  return [...byRegion.values()].sort((a, b) => b.total - a.total);
}

function buildSlaBuckets(applications: Application[]): SlaBucket[] {
  const stages: ApplicationState[] = [
    "SUBMITTED",
    "UNDER_SCRUTINY",
    "DEFICIENCY_NOTIFIED",
    "EVC_INSPECTION",
  ];
  const now = Date.now();
  return stages.map((stage) => {
    const scoped = applications.filter((application) => application.currentState === stage);
    let breached = 0;
    let atRisk = 0;
    let healthy = 0;
    for (const application of scoped) {
      const deadline = application.slaDeadline
        ? new Date(application.slaDeadline).getTime()
        : Number.POSITIVE_INFINITY;
      if (application.escalated || deadline <= now) breached += 1;
      else if (deadline - now <= 24 * 60 * 60 * 1000) atRisk += 1;
      else healthy += 1;
    }
    return { stage: STATE_META[stage].label, breached, atRisk, healthy };
  });
}

function buildDeficiencyBreakdown(applications: Application[]) {
  const counts = new Map<string, { count: number; severity: Severity }>();
  for (const application of applications) {
    for (const deficiency of application.deficiencies) {
      if (deficiency.isResolved) continue;
      const current = counts.get(deficiency.ruleCode);
      if (current) current.count += 1;
      else counts.set(deficiency.ruleCode, { count: 1, severity: deficiency.severity });
    }
  }
  return [...counts.entries()]
    .map(([ruleCode, meta]) => ({
      ruleCode,
      label:
        ruleBook.rules.find((rule) => rule.code === ruleCode)?.title ??
        ruleCode.replaceAll("_", " "),
      count: meta.count,
      severity: meta.severity,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Aggregates over `applications`. The default (every application) is only for the public landing page,
 * which shows a single dataset-wide average; authenticated callers must pass their scoped list.
 */
export function buildAnalytics(applications: Application[] = getDatabase().applications): AnalyticsSnapshot {

  const approved = applications.filter((app) => app.currentState === "APPROVED").length;
  const rejected = applications.filter((app) => app.currentState === "REJECTED").length;
  const decided = approved + rejected;
  const underReview = applications.filter((app) =>
    ["SUBMITTED", "UNDER_SCRUTINY", "EVC_INSPECTION"].includes(app.currentState),
  ).length;
  const activeDeficiencies = applications.reduce(
    (sum, app) => sum + app.deficiencies.filter((deficiency) => !deficiency.isResolved).length,
    0,
  );
  const slaBreaches = applications.filter(
    (app) =>
      app.escalated &&
      app.currentState !== "APPROVED" &&
      app.currentState !== "REJECTED",
  ).length;

  const cycleTimes = applications
    .filter((app) => DECIDED.includes(app.currentState) && app.submittedAt)
    .map((app) => {
      const submitted = new Date(app.submittedAt as string).getTime();
      const lastAudit = app.auditLogs[app.auditLogs.length - 1];
      const completed = lastAudit ? new Date(lastAudit.timestamp).getTime() : Date.now();
      return Math.max(0, (completed - submitted) / (1000 * 60 * 60 * 24));
    });

  const averageCompliance =
    applications.length > 0
      ? round(
          applications.reduce((sum, app) => sum + app.complianceScore, 0) /
            applications.length,
        )
      : 0;

  const buckets = ["0-20", "20-40", "40-60", "60-80", "80-99", "100"];
  const histogram = buckets.map((bucket) => ({ bucket, count: 0 }));
  for (const application of applications) {
    const score = application.complianceScore;
    const index =
      score >= 100 ? 5 : score >= 80 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : score >= 20 ? 1 : 0;
    const entry = histogram[index];
    if (entry) entry.count += 1;
  }

  return {
    kpis: {
      totalApplications: applications.length,
      approved,
      underReview,
      activeDeficiencies,
      slaBreaches,
      approvalRate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
      averageCompliance,
      medianCycleDays: median(cycleTimes),
    },
    states: buildStateDistribution(applications),
    regions: buildRegionDistribution(applications),
    slaBuckets: buildSlaBuckets(applications),
    deficiencyBreakdown: buildDeficiencyBreakdown(applications),
    stateTransitions: APPLICATION_STATES.map((stage) => ({
      stage,
      count: applications.filter((app) => app.currentState === stage).length,
    })),
    complianceHistogram: histogram,
    generatedAt: new Date().toISOString(),
  };
}
