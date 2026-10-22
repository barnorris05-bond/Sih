"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Gauge,
  Landmark,
  Layers,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  STATE_META,
  type AnalyticsSnapshot,
  type Application,
  type ApplicationState,
  type PlatformEvent,
} from "@aicte/shared";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  ComplianceHistogram,
  DeficiencyPareto,
  RegionalChart,
  SlaStackedChart,
  StateDistributionDonut,
} from "@/components/dashboard/charts";
import { SlaCountdown } from "@/components/dashboard/sla-countdown";
import { StatCard } from "@/components/dashboard/stat-card";
import { StateBadge } from "@/components/dashboard/state-badge";
import { ApplicationsTable } from "@/components/admin/applications-table";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { fireApprovalCelebration } from "@/lib/confetti";
import { CHART_PALETTE } from "@/lib/format";
import { cn, formatNumber, relativeTime } from "@/lib/utils";

interface CommandCenterProps {
  analytics: AnalyticsSnapshot;
  applications: Application[];
  events: PlatformEvent[];
  slaQueue: Application[];
  canDecide: boolean;
  actorName: string;
  scopeLabel: string;
}

const NEXT_STAGE: Partial<Record<ApplicationState, ApplicationState>> = {
  SUBMITTED: "UNDER_SCRUTINY",
  UNDER_SCRUTINY: "EVC_INSPECTION",
  EVC_INSPECTION: "APPROVED",
};

const NEXT_LABEL: Partial<Record<ApplicationState, string>> = {
  SUBMITTED: "Claim",
  UNDER_SCRUTINY: "Schedule EVC",
  EVC_INSPECTION: "Approve",
};

export function CommandCenter({
  analytics,
  applications,
  events,
  slaQueue,
  canDecide,
  actorName,
  scopeLabel,
}: CommandCenterProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState(applications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  const escalated = useMemo(
    () =>
      rows
        .filter(
          (application) =>
            application.escalated &&
            application.currentState !== "APPROVED" &&
            application.currentState !== "REJECTED",
        )
        .sort((a, b) => (a.slaDeadline ?? "").localeCompare(b.slaDeadline ?? "")),
    [rows],
  );

  const applyUpdate = useCallback((application: Application) => {
    setRows((current) =>
      current.map((entry) => (entry.id === application.id ? application : entry)),
    );
  }, []);

  const decide = useCallback(
    async (application: Application, target: ApplicationState, note: string) => {
      setPendingId(application.id);
      try {
        const { application: updated } = await api.transition(application.id, target, note);
        applyUpdate(updated);
        if (target === "APPROVED") {
          void fireApprovalCelebration();
          toast({
            title: "Approval issued",
            description: `${application.institution.name} has been approved for ${application.academicYear}.`,
            variant: "success",
          });
        } else {
          toast({
            title: `Moved to ${STATE_META[target].label}`,
            description: `${application.institution.name} · ${STATE_META[target].description}`,
            variant: "success",
          });
        }
        router.refresh();
      } catch (error) {
        toast({
          title: "Action rejected",
          description: error instanceof ApiError ? error.message : "Unexpected error.",
          variant: "error",
        });
      } finally {
        setPendingId(null);
      }
    },
    [applyUpdate, router, toast],
  );

  function quickAdvance(application: Application) {
    const target = NEXT_STAGE[application.currentState];
    if (!target) return;
    if (target === "APPROVED" && !canDecide) {
      toast({
        title: "Final decisions are restricted",
        description: "Only the Scrutiny Desk and AICTE Admins can issue approvals.",
        variant: "warning",
      });
      return;
    }
    void decide(
      application,
      target,
      target === "APPROVED"
        ? "Approved from the executive command center after EVC clearance."
        : `Advanced from the executive command center to ${STATE_META[target].label}.`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Total applications"
          value={analytics.kpis.totalApplications}
          icon="layers"
          accent="indigo"
          hint={`${scopeLabel} · ${formatNumber(analytics.states.length)} states reporting`}
        />
        <StatCard
          label="Approval rate"
          value={analytics.kpis.approvalRate}
          suffix="%"
          icon="trending"
          accent="emerald"
          hint={`${analytics.kpis.approved} institutions approved`}
          delay={0.05}
        />
        <StatCard
          label="Open deficiencies"
          value={analytics.kpis.activeDeficiencies}
          icon="alert"
          accent="amber"
          hint="Rule-level gaps awaiting remediation"
          delay={0.1}
        />
        <StatCard
          label="SLA breaches"
          value={analytics.kpis.slaBreaches}
          icon="clock"
          accent="rose"
          hint="Auto-escalated by the scheduler"
          delay={0.15}
        />
        <StatCard
          label="Median cycle"
          value={analytics.kpis.medianCycleDays}
          suffix="d"
          decimals={1}
          icon="timer"
          accent="sky"
          hint={`Average index ${analytics.kpis.averageCompliance}%`}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>National pipeline</CardTitle>
              <CardDescription>
                Live snapshot of the approval funnel across every region.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Auto-refresh via live stream
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sla">SLA & bottlenecks</TabsTrigger>
                <TabsTrigger value="files">Applications</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        State-wise approval heatmap
                      </p>
                      <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-rose-400/70" /> low
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-amber-400/80" /> mid
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-emerald-400/90" /> high
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {analytics.states.map((stateEntry) => (
                        <motion.div
                          key={stateEntry.state}
                          whileHover={{ y: -2 }}
                          title={`${stateEntry.state} · ${stateEntry.total} applications · ${stateEntry.averageCompliance}% avg index`}
                          className={cn(
                            "rounded-lg border p-2 transition-colors",
                            stateEntry.approvalRate >= 60
                              ? "border-emerald-400/25 bg-emerald-400/[0.08]"
                              : stateEntry.approvalRate >= 30
                                ? "border-indigo-400/20 bg-indigo-500/[0.07]"
                                : "border-amber-400/20 bg-amber-400/[0.06]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="truncate text-[10px] font-medium text-foreground">
                              {stateEntry.state}
                            </p>
                            <span className="text-[9px] tabular-nums text-muted-foreground">
                              {stateEntry.total}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[8px] text-muted-foreground">
                              {stateEntry.region}
                            </span>
                            <span className="text-[9px] font-semibold tabular-nums text-foreground">
                              {stateEntry.approvalRate}%
                            </span>
                          </div>
                          <div className="mt-1 h-0.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-current opacity-60"
                              style={{ width: `${stateEntry.averageCompliance}%` }}
                            />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Regional throughput
                      </p>
                      <RegionalChart data={analytics.regions} />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Compliance distribution
                    </p>
                    <ComplianceHistogram data={analytics.complianceHistogram} />
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      State concentration
                    </p>
                    <StateDistributionDonut data={analytics.states} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {analytics.stateTransitions.map((entry) => (
                    <span
                      key={entry.stage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] text-muted-foreground"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_PALETTE[
                              analytics.stateTransitions.indexOf(entry) % CHART_PALETTE.length
                            ],
                        }}
                      />
                      {STATE_META[entry.stage].short}
                      <span className="font-medium tabular-nums text-foreground">{entry.count}</span>
                    </span>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="sla" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      SLA health by stage
                    </p>
                    <SlaStackedChart data={analytics.slaBuckets} />
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Deficiency Pareto
                    </p>
                    <DeficiencyPareto data={analytics.deficiencyBreakdown} />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Live SLA queue
                  </p>
                  <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                    <table className="w-full min-w-[560px] text-left text-[10px]">
                      <thead className="bg-white/[0.03] text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Institution</th>
                          <th className="px-3 py-2 font-medium">Stage</th>
                          <th className="px-3 py-2 font-medium">SLA</th>
                          <th className="px-3 py-2 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {slaQueue.map((application) => (
                          <tr key={application.id} className="border-t border-white/[0.05]">
                            <td className="max-w-[220px] px-3 py-2">
                              <p className="truncate text-[11px] text-foreground">
                                {application.institution.name}
                              </p>
                              <p className="truncate text-[9px] text-muted-foreground">
                                {application.institution.state} · {application.institution.aicteCode}
                              </p>
                            </td>
                            <td className="px-3 py-2">
                              <StateBadge state={application.currentState} dot={false} />
                            </td>
                            <td className="px-3 py-2">
                              <SlaCountdown deadline={application.slaDeadline} compact />
                            </td>
                            <td className="px-3 py-2 text-right">
                              {NEXT_STAGE[application.currentState] ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 px-2 text-[9px]"
                                  loading={pendingId === application.id}
                                  onClick={() => quickAdvance(application)}
                                >
                                  {NEXT_LABEL[application.currentState]}
                                  <ArrowRight className="h-2.5 w-2.5" />
                                </Button>
                              ) : (
                                <span className="text-[9px] text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {slaQueue.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                              No active SLA windows.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="files">
                <ApplicationsTable
                  applications={rows}
                  canDecide={canDecide}
                  pendingId={pendingId}
                  onApprove={(application) =>
                    void decide(
                      application,
                      "APPROVED",
                      "Approved from the executive applications grid after EVC clearance.",
                    )
                  }
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertOctagon className="h-4 w-4 text-rose-300" /> Escalation queue
              </CardTitle>
              <CardDescription>{escalated.length} breached window(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <AnimatePresence initial={false}>
                {escalated.slice(0, 5).map((application) => (
                  <motion.div
                    key={application.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg border border-rose-400/20 bg-rose-500/[0.05] px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <p className="line-clamp-1 text-[10px] font-medium text-foreground">
                        {application.institution.name}
                      </p>
                      <span className="shrink-0 rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-rose-200">
                        SLA
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-1.5">
                      <span className="text-[9px] text-muted-foreground">
                        {STATE_META[application.currentState].short}
                      </span>
                      <SlaCountdown deadline={application.slaDeadline} compact />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {escalated.length === 0 ? (
                <p className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.04] p-3 text-[10px] text-emerald-200/80">
                  No open breaches. The scheduler continues to sweep every 20 seconds.
                </p>
              ) : null}
              <Link href="/reviewer" className="mt-1 block">
                <Button variant="ghost" size="sm" className="w-full justify-between text-[10px]">
                  Open scrutiny desk <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-emerald-300" /> System audit feed
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ActivityFeed initialEvents={events} limit={9} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-5 text-[10px]">
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" /> SLA sweeper
                </span>
                <span className="text-emerald-300">Active · 20s</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Gauge className="h-3 w-3 text-indigo-300" /> Rule book
                </span>
                <span className="font-mono text-foreground">APH-2026.1</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3 text-sky-300" /> Actor
                </span>
                <span className="text-foreground">{actorName}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ClipboardList className="h-3 w-3 text-violet-300" /> Generated
                </span>
                <span className="text-foreground">{relativeTime(analytics.generatedAt)}</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {analytics.slaBuckets.map((bucket) => (
          <div
            key={bucket.stage}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
          >
            <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
              {bucket.stage}
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-display text-lg font-semibold text-foreground">
                {bucket.breached + bucket.atRisk + bucket.healthy}
              </span>
              <span className="text-[9px] text-muted-foreground">files</span>
            </div>
            <div className="mt-1.5 flex h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className="bg-emerald-400/80"
                style={{
                  width: `${
                    bucket.healthy + bucket.atRisk + bucket.breached > 0
                      ? (bucket.healthy / (bucket.healthy + bucket.atRisk + bucket.breached)) * 100
                      : 0
                  }%`,
                }}
              />
              <span
                className="bg-amber-400/80"
                style={{
                  width: `${
                    bucket.healthy + bucket.atRisk + bucket.breached > 0
                      ? (bucket.atRisk / (bucket.healthy + bucket.atRisk + bucket.breached)) * 100
                      : 0
                  }%`,
                }}
              />
              <span
                className="bg-rose-400/80"
                style={{
                  width: `${
                    bucket.healthy + bucket.atRisk + bucket.breached > 0
                      ? (bucket.breached / (bucket.healthy + bucket.atRisk + bucket.breached)) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {bucket.breached} breached · {bucket.atRisk} at risk
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
