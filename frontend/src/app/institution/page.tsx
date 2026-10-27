import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  FileWarning,
  GraduationCap,
  Landmark,
  Layers,
  Ruler,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ROLE_META,
  STATE_META,
  evaluateCompliance,
  isTerminalState,
  type Application,
} from "@aicte/shared";
import {
  ensurePlatformRuntime,
  getAuditFeed,
  listApplications,
  recentEvents,
} from "@aicte/backend";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { SlaCountdown } from "@/components/dashboard/sla-countdown";
import { StateBadge } from "@/components/dashboard/state-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { WorkflowTimeline } from "@/components/dashboard/workflow-timeline";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { RuleCheckList } from "@/components/forms/rule-check-list";
import { FadeIn } from "@/components/animations/fade-in";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { formatArea, formatDate, formatNumber, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Institution overview",
};

function activeApplication(applications: Application[]): Application | null {
  return (
    applications.find((application) => !isTerminalState(application.currentState)) ??
    applications[0] ??
    null
  );
}

export default async function InstitutionDashboard() {
  const session = await getSession();
  if (!session) redirect("/login?next=/institution");
  if (session.role !== "INSTITUTION_USER") redirect(ROLE_META[session.role].home);

  ensurePlatformRuntime();
  const applications = listApplications(session);
  const applicationsList = applications;
  const active = activeApplication(applicationsList);
  const evaluation = active ? evaluateCompliance(active.formData) : null;
  const openDeficiencies =
    active?.deficiencies.filter((deficiency) => !deficiency.isResolved) ?? [];
  const openDeficiencyTotal = applicationsList.reduce(
    (sum, application) =>
      sum + application.deficiencies.filter((deficiency) => !deficiency.isResolved).length,
    0,
  );
  const hasDraft = applicationsList.some(
    (application) => application.currentState === "DRAFT",
  );

  const applicationIds = new Set(applicationsList.map((application) => application.id));
  const events = recentEvents(40).filter(
    (event) => event.applicationId && applicationIds.has(event.applicationId),
  );
  const feed =
    events.length > 0
      ? events
      : getAuditFeed(8)
          .filter((item) => applicationIds.has(item.applicationId))
          .map((item) => ({
            id: item.id,
            type: "STATE_CHANGED" as const,
            title: STATE_META[item.newState].label,
            message: `${item.institution} · ${item.actionNotes}`,
            applicationId: item.applicationId,
            severity: "INFO" as const,
            timestamp: item.timestamp,
          }));
  return (
    <PageShell
      eyebrow="Institution workspace"
      title={session.institutionName ?? "Institution"}
      description="Track the live compliance index, respond to show-cause notices and follow every transition of your 2026-27 approval file."
      actions={
        <>
          <Link href="/institution/deficiencies">
            <Button variant="secondary" size="sm">
              <FileWarning className="h-3.5 w-3.5" />
              Deficiency desk
              {openDeficiencyTotal > 0 ? (
                <span className="ml-1 rounded-full bg-rose-500/20 px-1.5 text-[9px] text-rose-300">
                  {openDeficiencyTotal}
                </span>
              ) : null}
            </Button>
          </Link>
          <Link href="/institution/apply">
            <Button size="sm">
              {hasDraft ? "Continue draft" : "Start application"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Compliance index"
          value={active?.complianceScore ?? 0}
          suffix="%"
          icon="shield"
          accent="indigo"
          hint={
            evaluation
              ? `${evaluation.passedRules}/${evaluation.totalRules} statutory rules cleared`
              : "No application in progress"
          }
        />
        <StatCard
          label="Open deficiencies"
          value={openDeficiencyTotal}
          icon="warning"
          accent="rose"
          hint="Show-cause items awaiting remediation"
          delay={0.05}
        />
        <StatCard
          label="Applications filed"
          value={applicationsList.length}
          icon="layers"
          accent="sky"
          hint="All filings linked to this institution"
          delay={0.1}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <FadeIn className="space-y-4">
          {active ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{active.academicYear} application</CardTitle>
                    <StateBadge state={active.currentState} />
                    {active.escalated ? (
                      <Badge variant="danger" dot className="animate-pulse">
                        SLA escalated
                      </Badge>
                    ) : null}
                  </div>
                  <CardDescription className="mt-1">
                    {STATE_META[active.currentState].description}
                  </CardDescription>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Application ID
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-foreground">
                    {active.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <WorkflowTimeline state={active.currentState} />

                <div className="grid gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <ComplianceGauge
                    score={evaluation?.score ?? active.complianceScore}
                    size={154}
                    strokeWidth={10}
                    showRules={
                      evaluation
                        ? {
                            passed: evaluation.passedRules,
                            total: evaluation.totalRules,
                          }
                        : undefined
                    }
                  />
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <Metric icon={GraduationCap} label="Intake" value={formatNumber(active.formData.totalStudentIntake)} />
                    <Metric icon={Users} label="Faculty" value={formatNumber(active.formData.facultyCount)} />
                    <Metric icon={Layers} label="Programmes" value={String(active.formData.programs.length)} />
                    <Metric icon={Ruler} label="Built-up" value={formatArea(active.formData.builtUpArea)} />
                    <Metric icon={Building2} label="Campus land" value={formatArea(active.formData.landArea)} />
                    <Metric icon={BookOpen} label="Volumes" value={formatNumber(active.formData.libraryVolumes)} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {active.currentState === "DRAFT" ? (
                    <Link href="/institution/apply">
                      <Button size="sm">
                        Continue draft <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  ) : null}
                  {active.currentState === "DEFICIENCY_NOTIFIED" ||
                  active.currentState === "RULE_VALIDATION_FAILED" ? (
                    <Link href="/institution/deficiencies">
                      <Button size="sm" variant="danger">
                        Remediate {openDeficiencies.length} deficiencies
                      </Button>
                    </Link>
                  ) : null}
                  {active.currentState === "SUBMITTED" || active.currentState === "UNDER_SCRUTINY" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-1.5 text-[11px] text-sky-200">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      File is with the scrutiny desk
                    </span>
                  ) : null}
                  {active.currentState === "EVC_INSPECTION" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-400/[0.06] px-3 py-1.5 text-[11px] text-violet-200">
                      <Landmark className="h-3.5 w-3.5" />
                      Expert Visit Committee scheduled
                    </span>
                  ) : null}
                  {active.currentState === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1.5 text-[11px] text-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5" /> Letter of approval issued
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-display text-sm font-semibold text-foreground">
                  No application yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Start the guided wizard. The compliance meter updates as you type, before you
                  submit anything.
                </p>
                <Link href="/institution/apply" className="mt-4 inline-block">
                  <Button size="sm">Start your first application</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {evaluation ? (
            <Card>
              <CardHeader>
                <CardTitle>Statutory rule checklist</CardTitle>
                <CardDescription>
                  Recomputed from the declared payload using handbook {evaluation.totalRules} rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RuleCheckList checks={evaluation.checks} showRemediation />
              </CardContent>
            </Card>
          ) : null}
        </FadeIn>

        <div className="space-y-4">
          <FadeIn delay={0.05}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-indigo-300" /> SLA monitor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SlaCountdown
                  deadline={active?.slaDeadline ?? null}
                  label={`${active ? STATE_META[active.currentState].label : "Workflow"} window`}
                />
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  <p className="flex items-center justify-between">
                    <span>Submitted</span>
                    <span className="text-foreground">{formatDate(active?.submittedAt ?? null)}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Last update</span>
                    <span className="text-foreground">{formatDate(active?.updatedAt ?? null)}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>Academic year</span>
                    <span className="text-foreground">{active?.academicYear ?? "2026-2027"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>Application history</CardTitle>
                <CardDescription>Every filing linked to this institution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {applicationsList.slice(0, 6).map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {application.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {application.academicYear} · {application.complianceScore}% index
                      </p>
                    </div>
                    <StateBadge state={application.currentState} dot={false} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </FadeIn>

          <FadeIn delay={0.15}>
            <Card>
              <CardContent className="pt-5">
                <ActivityFeed initialEvents={feed} limit={7} />
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>

      {openDeficiencies.length > 0 ? (
        <FadeIn className="mt-4">
          <Card className="border-amber-400/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-200">
                <FileWarning className="h-4 w-4" /> Show-cause notice requires action
              </CardTitle>
              <CardDescription>
                {openDeficiencies.length} unmet requirement(s) block your approval. The remediation
                deadline is tracked by the SLA engine.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {openDeficiencies.slice(0, 4).map((deficiency) => (
                  <div
                    key={deficiency.id}
                    className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3"
                  >
                    <p className="text-[11px] font-medium text-foreground">{deficiency.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Required {deficiency.requiredValue} · declared {deficiency.actualValue}
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/institution/deficiencies" className="mt-4 inline-block">
                <Button size="sm" variant="danger">
                  Open remediation desk <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}
    </PageShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-2.5 w-2.5" /> {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}
