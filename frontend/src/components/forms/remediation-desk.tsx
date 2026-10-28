"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Loader2,
  RotateCcw,
  Ruler,
  Send,
  Users,
  Wand2,
} from "lucide-react";
import {
  evaluateCompliance,
  requiredFacultyFor,
  type Application,
  type ApplicationFormData,
  type Deficiency,
  type Severity,
} from "@aicte/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { SlaCountdown } from "@/components/dashboard/sla-countdown";
import { RuleCheckList } from "@/components/forms/rule-check-list";
import { useToast } from "@/components/providers/toast-provider";
import { api, ApiError } from "@/lib/api";
import { SEVERITY_STYLES } from "@/lib/format";
import { cn, formatDate, formatNumber } from "@/lib/utils";

type EditableMetrics = Pick<
  ApplicationFormData,
  | "facultyCount"
  | "professorsCount"
  | "associateProfessorsCount"
  | "assistantProfessorsCount"
  | "phdFacultyCount"
  | "builtUpArea"
  | "libraryVolumes"
  | "landArea"
>;

const EDITABLE_KEYS: Array<keyof EditableMetrics> = [
  "facultyCount",
  "professorsCount",
  "associateProfessorsCount",
  "assistantProfessorsCount",
  "phdFacultyCount",
  "builtUpArea",
  "libraryVolumes",
  "landArea",
];

export function RemediationDesk({ initialApplication }: { initialApplication: Application }) {
  const router = useRouter();
  const { toast } = useToast();
  const [application, setApplication] = useState(initialApplication);
  const [metrics, setMetrics] = useState<EditableMetrics>(() => ({
    facultyCount: initialApplication.formData.facultyCount,
    professorsCount: initialApplication.formData.professorsCount,
    associateProfessorsCount: initialApplication.formData.associateProfessorsCount,
    assistantProfessorsCount: initialApplication.formData.assistantProfessorsCount,
    phdFacultyCount: initialApplication.formData.phdFacultyCount,
    builtUpArea: initialApplication.formData.builtUpArea,
    libraryVolumes: initialApplication.formData.libraryVolumes,
    landArea: initialApplication.formData.landArea,
  }));
  const [resubmitting, setResubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const formData = useMemo<ApplicationFormData>(
    () => ({ ...application.formData, ...metrics }),
    [application.formData, metrics],
  );
  const evaluation = useMemo(() => evaluateCompliance(formData), [formData]);
  const openDeficiencies = application.deficiencies.filter((deficiency) => !deficiency.isResolved);
  const resolvedDeficiencies = application.deficiencies.filter((deficiency) => deficiency.isResolved);
  const nextDeadline = openDeficiencies
    .map((deficiency) => deficiency.remediationDeadline)
    .sort()[0];

  function update<K extends keyof EditableMetrics>(key: K, value: number) {
    setMetrics((current) => ({ ...current, [key]: Number.isFinite(value) ? Math.max(0, value) : 0 }));
  }

  function applyMinimums() {
    const intake = formData.totalStudentIntake;
    const required = requiredFacultyFor(formData);
    const faculty = Math.max(metrics.facultyCount, required);
    const professors = Math.ceil(faculty / 9);
    const associate = Math.ceil((faculty * 2) / 9);
    setMetrics({
      facultyCount: faculty,
      professorsCount: professors,
      associateProfessorsCount: associate,
      assistantProfessorsCount: faculty - professors - associate,
      phdFacultyCount: Math.max(metrics.phdFacultyCount, Math.ceil(faculty * 0.45)),
      builtUpArea: Math.max(metrics.builtUpArea, Math.ceil(intake * 2.5) + 200),
      libraryVolumes: Math.max(metrics.libraryVolumes, intake * 13),
      landArea: Math.max(metrics.landArea, 9000),
    });
    toast({
      title: "Minimums applied to the editor",
      description: "Review the recalculated verdict, then resubmit when ready.",
      variant: "info",
    });
  }

  function reset() {
    setMetrics({
      facultyCount: application.formData.facultyCount,
      professorsCount: application.formData.professorsCount,
      associateProfessorsCount: application.formData.associateProfessorsCount,
      assistantProfessorsCount: application.formData.assistantProfessorsCount,
      phdFacultyCount: application.formData.phdFacultyCount,
      builtUpArea: application.formData.builtUpArea,
      libraryVolumes: application.formData.libraryVolumes,
      landArea: application.formData.landArea,
    });
  }

  async function toggleResolved(deficiency: Deficiency) {
    setTogglingId(deficiency.id);
    try {
      const { application: updated } = await api.resolveDeficiency(
        application.id,
        deficiency.id,
        !deficiency.isResolved,
      );
      setApplication(updated);
    } catch (error) {
      toast({
        title: "Could not update the checklist",
        description: error instanceof ApiError ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function resubmit() {
    setResubmitting(true);
    try {
      const { application: updated } = await api.resubmit(application.id, formData);
      setApplication(updated);
      if (updated.currentState === "DEFICIENCY_NOTIFIED") {
        toast({
          title: "Still non-compliant",
          description: `${updated.deficiencies.filter((d) => !d.isResolved).length} requirement(s) remain unmet. Adjust the metrics and retry.`,
          variant: "warning",
        });
        router.refresh();
      } else {
        toast({
          title: "Corrected application resubmitted",
          description: "All automated checks passed. The scrutiny desk has been notified.",
          variant: "success",
        });
        router.push("/institution");
        router.refresh();
      }
    } catch (error) {
      toast({
        title: "Resubmission blocked",
        description: error instanceof ApiError ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setResubmitting(false);
    }
  }

  const passed = evaluation.isCompliant;

  return (
    <div className="space-y-4">
      <Card className={cn("overflow-hidden", passed ? "border-emerald-400/25" : "border-amber-400/25")}>
        <CardContent className="grid gap-x-5 gap-y-4 pt-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center lg:grid-cols-[auto_minmax(0,1fr)_minmax(14rem,17rem)]">
          <ComplianceGauge
            score={evaluation.score}
            size={144}
            strokeWidth={9}
            compactText
            showRules={{ passed: evaluation.passedRules, total: evaluation.totalRules }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={passed ? "success" : "warning"} dot>
                {passed ? "All constraints satisfied" : `${evaluation.deficiencies.length} constraints failing`}
              </Badge>
              {application.escalated ? (
                <Badge variant="danger" dot className="animate-pulse">
                  SLA escalated
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">
              {passed
                ? "Your corrected declaration clears every handbook rule."
                : "The notice stays open until every failing rule is resolved."}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Resubmission re-runs the full rule engine on the server. Audit history is preserved
              across attempts; nothing is silently overwritten.
            </p>
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <SlaCountdown deadline={nextDeadline ?? application.slaDeadline} label="Remediation SLA" />
            <p className="text-right text-[10px] text-muted-foreground">
              Notice issued {formatDate(application.updatedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="min-w-0 space-y-3">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0 flex-1 basis-[12rem]">
                <CardTitle>Show-cause notice</CardTitle>
                <CardDescription>
                  Rule-level evidence issued by the scrutiny desk.
                </CardDescription>
              </div>
              <Badge variant="danger" className="shrink-0 whitespace-nowrap">
                {openDeficiencies.length} open
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <AnimatePresence initial={false}>
                {application.deficiencies.length === 0 ? (
                  <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-muted-foreground">
                    No deficiencies recorded against this application.
                  </p>
                ) : null}
                {application.deficiencies.map((deficiency) => {
                  const style = SEVERITY_STYLES[deficiency.severity as Severity];
                  return (
                    <motion.div
                      key={deficiency.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "rounded-xl border p-3 transition-opacity",
                        deficiency.isResolved
                          ? "border-emerald-400/20 bg-emerald-400/[0.04] opacity-70"
                          : "border-white/[0.08] bg-white/[0.025]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "flex items-start gap-1.5 text-[11px] font-medium leading-snug",
                              deficiency.isResolved
                                ? "text-emerald-200 line-through decoration-emerald-400/40"
                                : "text-foreground",
                            )}
                          >
                            {deficiency.isResolved ? (
                              <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-300" />
                            )}
                            {deficiency.title}
                          </p>
                          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                            {deficiency.description}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
                            <span className="text-muted-foreground">
                              Required <span className="text-foreground">{deficiency.requiredValue}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Declared <span className="text-rose-300">{deficiency.actualValue}</span>
                            </span>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                            style.className,
                          )}
                        >
                          {deficiency.severity}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="min-w-0 break-all font-mono text-[10px] text-muted-foreground/70">
                          {deficiency.ruleCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleResolved(deficiency)}
                          disabled={togglingId === deficiency.id}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground disabled:opacity-50"
                        >
                          {togglingId === deficiency.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : null}
                          {deficiency.isResolved ? "Reopen" : "Mark resolved"}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {resolvedDeficiencies.length > 0 ? (
                <p className="pt-1 text-[10px] text-muted-foreground">
                  {resolvedDeficiencies.length} previously resolved item(s) retained in the audit
                  trail.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Engine verdict after your edits</CardTitle>
            </CardHeader>
            <CardContent>
              <RuleCheckList checks={evaluation.checks} showRemediation />
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader className="flex-row flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1 basis-[14rem]">
              <CardTitle>Correct the declaration</CardTitle>
              <CardDescription>
                Update the metrics your notice relates to. Totals recalculate instantly.
              </CardDescription>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={applyMinimums} className="shrink-0">
              <Wand2 className="h-3.5 w-3.5" /> Apply minimums
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <ReadOnlyStat icon={GraduationCap} label="Sanctioned intake" value={formatNumber(formData.totalStudentIntake)} />
              <ReadOnlyStat icon={Landmark} label="Programmes" value={String(formData.programs.length)} />
            </div>

            <div className="space-y-3">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Users className="h-3 w-3" /> Faculty
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricInput
                  label="Full-time faculty"
                  value={metrics.facultyCount}
                  onChange={(value) => update("facultyCount", value)}
                  hint={`Required ${requiredFacultyFor(formData)}`}
                />
                <MetricInput
                  label="Ph.D. faculty"
                  value={metrics.phdFacultyCount}
                  onChange={(value) => update("phdFacultyCount", value)}
                  hint={`Target ≥ ${Math.ceil(metrics.facultyCount * 0.4)}`}
                />
                <MetricInput
                  label="Professors"
                  value={metrics.professorsCount}
                  onChange={(value) => update("professorsCount", value)}
                />
                <MetricInput
                  label="Associate professors"
                  value={metrics.associateProfessorsCount}
                  onChange={(value) => update("associateProfessorsCount", value)}
                />
                <MetricInput
                  label="Assistant professors"
                  value={metrics.assistantProfessorsCount}
                  onChange={(value) => update("assistantProfessorsCount", value)}
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-white/[0.06] pt-4">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <Ruler className="h-3 w-3" /> Infrastructure & resources
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricInput
                  label="Built-up area (sq.m)"
                  value={metrics.builtUpArea}
                  onChange={(value) => update("builtUpArea", value)}
                  hint={`Required ${formatNumber(Math.ceil(formData.totalStudentIntake * 2.5))}`}
                />
                <MetricInput
                  label="Campus land (sq.m)"
                  value={metrics.landArea}
                  onChange={(value) => update("landArea", value)}
                  hint="Minimum 8,000"
                />
                <MetricInput
                  label="Library volumes"
                  value={metrics.libraryVolumes}
                  onChange={(value) => update("libraryVolumes", value)}
                  hint={`Target ≥ ${formatNumber(formData.totalStudentIntake * 12)}`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Ruler className="h-3 w-3" />
                Live index
                <span className="font-display text-sm font-semibold text-foreground">
                  {evaluation.score}%
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={passed ? "success" : "primary"}
                  onClick={resubmit}
                  loading={resubmitting}
                >
                  <Send className="h-3.5 w-3.5" /> Resubmit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <p className="text-[10px] leading-relaxed text-muted-foreground">
              <BookOpen className="mr-1 inline h-3 w-3" />
              Resubmission moves the file back to <span className="text-foreground">Submitted</span>{" "}
              and restarts the 48-hour scrutiny SLA. If any rule still fails, a fresh notice is
              raised with a new seven-day window.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const inputId = useId();
  return (
    <div className="min-w-0">
      <Label htmlFor={inputId} className="mb-1 block text-[10px]">
        {label}
      </Label>
      <Input
        id={inputId}
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        className="h-9 text-xs"
      />
      {hint ? <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ReadOnlyStat({
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
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="h-2.5 w-2.5 shrink-0" /> {label}
      </p>
      <p className="mt-0.5 text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}
