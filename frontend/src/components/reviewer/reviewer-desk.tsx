"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileText,
  FileWarning,
  Gavel,
  GraduationCap,
  Landmark,
  Layers,
  Ruler,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  STATE_META,
  evaluateCompliance,
  type Application,
  type ApplicationState,
} from "@aicte/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { SlaCountdown } from "@/components/dashboard/sla-countdown";
import { StateBadge } from "@/components/dashboard/state-badge";
import { RuleCheckList } from "@/components/forms/rule-check-list";
import { useToast } from "@/components/providers/toast-provider";
import { api, ApiError } from "@/lib/api";
import { fireApprovalCelebration } from "@/lib/confetti";
import { formatArea, formatDate, formatNumber, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { springSoft } from "@/lib/motion";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "action", label: "Actionable" },
  { key: "all", label: "All files" },
  { key: "SUBMITTED", label: "New" },
  { key: "UNDER_SCRUTINY", label: "In scrutiny" },
  { key: "EVC_INSPECTION", label: "EVC" },
  { key: "DEFICIENCY_NOTIFIED", label: "Deficient" },
  { key: "closed", label: "Closed" },
];

interface DialogState {
  type: "flag" | "decision";
  target?: ApplicationState;
}

export function ReviewerDesk({ initialApplications }: { initialApplications: Application[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [applications, setApplications] = useState(initialApplications);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialApplications[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("action");
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, string[]>>({});
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const selected = applications.find((application) => application.id === selectedId) ?? null;
  const evaluation = useMemo(
    () => (selected ? evaluateCompliance(selected.formData) : null),
    [selected],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesSearch =
        term.length === 0 ||
        application.institution.name.toLowerCase().includes(term) ||
        application.institution.aicteCode.toLowerCase().includes(term) ||
        application.id.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (filter === "all") return true;
      if (filter === "action") {
        return ["SUBMITTED", "UNDER_SCRUTINY", "EVC_INSPECTION"].includes(
          application.currentState,
        );
      }
      if (filter === "closed") {
        return application.currentState === "APPROVED" || application.currentState === "REJECTED";
      }
      return application.currentState === filter;
    });
  }, [applications, search, filter]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { action: 0, all: applications.length, closed: 0 };
    for (const application of applications) {
      base[application.currentState] = (base[application.currentState] ?? 0) + 1;
      if (["SUBMITTED", "UNDER_SCRUTINY", "EVC_INSPECTION"].includes(application.currentState)) {
        base.action = (base.action ?? 0) + 1;
      }
      if (application.currentState === "APPROVED" || application.currentState === "REJECTED") {
        base.closed = (base.closed ?? 0) + 1;
      }
    }
    return base;
  }, [applications]);

  function selectApplication(id: string) {
    setSelectedId(id);
    setExpandedDoc(null);
  }

  function verifiedFor(id: string): string[] {
    return verifiedDocs[id] ?? [];
  }

  function toggleDocument(applicationId: string, documentId: string) {
    setVerifiedDocs((current) => {
      const existing = current[applicationId] ?? [];
      return {
        ...current,
        [applicationId]: existing.includes(documentId)
          ? existing.filter((id) => id !== documentId)
          : [...existing, documentId],
      };
    });
  }

  async function transition(target: ApplicationState, note?: string) {
    if (!selected) return;
    setPending(true);
    try {
      const { application } = await api.transition(selected.id, target, note);
      setApplications((current) =>
        current.map((entry) => (entry.id === application.id ? application : entry)),
      );
      setDialog(null);
      setNotes("");
      toast({
        title: `Moved to ${STATE_META[application.currentState].label}`,
        description: `${application.institution.name} · ${STATE_META[application.currentState].description}`,
        variant: application.currentState === "REJECTED" ? "warning" : "success",
      });
      if (application.currentState === "APPROVED") {
        void fireApprovalCelebration();
      }
      router.refresh();
    } catch (error) {
      toast({
        title: "Transition rejected",
        description: error instanceof ApiError ? error.message : "Unexpected error.",
        variant: "error",
      });
    } finally {
      setPending(false);
    }
  }

  function openDialog(type: DialogState["type"], target?: ApplicationState) {
    setDialog({ type, target });
    setNotes(
      type === "flag"
        ? `Automated validation identified ${evaluation?.deficiencies.length ?? 0} unmet requirement(s). Please remediate and resubmit.`
        : "",
    );
  }

  const openDeficiencies =
    selected?.deficiencies.filter((deficiency) => !deficiency.isResolved) ?? [];

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_370px]">
      <Card className="h-fit xl:sticky xl:top-24">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Pipeline queue
            <Badge variant="neutral">{filtered.length}</Badge>
          </CardTitle>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search institution or code"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <div className="scrollbar-none mt-2 flex gap-1 overflow-x-auto pb-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={cn(
                  "shrink-0 rounded-lg border px-2 py-1 text-[9px] font-medium transition-colors",
                  filter === item.key
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-200"
                    : "border-white/[0.07] text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-1 opacity-60">{counts[item.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="scrollbar-none max-h-[620px] space-y-1.5 overflow-y-auto pt-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-white/[0.06] p-4 text-center text-[10px] text-muted-foreground">
              No files match this filter.
            </p>
          ) : null}
          <AnimatePresence initial={false}>
            {filtered.map((application) => {
              const isSelected = application.id === selected?.id;
              const open = application.deficiencies.filter((d) => !d.isResolved).length;
              return (
                <motion.button
                  key={application.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  type="button"
                  onClick={() => selectApplication(application.id)}
                  className={cn(
                    "w-full rounded-xl border p-2.5 text-left transition-all",
                    isSelected
                      ? "border-indigo-400/40 bg-indigo-500/[0.09]"
                      : "border-white/[0.06] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.035]",
                  )}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <p className="line-clamp-2 text-[11px] font-medium text-foreground">
                      {application.institution.name}
                    </p>
                    {application.escalated ? (
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-rose-400" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">
                    {application.institution.aicteCode}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <StateBadge state={application.currentState} dot={false} className="px-1.5 py-0 text-[9px]" />
                    {open > 0 ? (
                      <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-1.5 text-[9px] text-rose-300">
                        {open} gap{open > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      {application.complianceScore}% index
                    </span>
                    <SlaCountdown deadline={application.slaDeadline} compact />
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="min-w-0">
        {selected && evaluation ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={springSoft}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate text-base">
                          {selected.institution.name}
                        </CardTitle>
                        <StateBadge state={selected.currentState} />
                      </div>
                      <CardDescription className="mt-1">
                        {selected.institution.city}, {selected.institution.state} · AICTE{" "}
                        {selected.institution.aicteCode} · AY {selected.academicYear}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                        File ID
                      </p>
                      <p className="font-mono text-[11px] text-foreground">
                        {selected.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="mt-1 text-[9px] text-muted-foreground">
                        Updated {relativeTime(selected.updatedAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Metric icon={GraduationCap} label="Intake" value={formatNumber(selected.formData.totalStudentIntake)} />
                    <Metric icon={Users} label="Faculty" value={formatNumber(selected.formData.facultyCount)} />
                    <Metric icon={Ruler} label="Built-up" value={formatArea(selected.formData.builtUpArea)} />
                    <Metric icon={Landmark} label="Campus" value={formatArea(selected.formData.landArea)} />
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/[0.07]">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-white/[0.03] text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Programme</th>
                          <th className="px-3 py-2 font-medium">Degree</th>
                          <th className="px-3 py-2 text-right font-medium">Intake</th>
                          <th className="px-3 py-2 text-right font-medium">Accredited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.formData.programs.map((program) => (
                          <tr key={program.id} className="border-t border-white/[0.05]">
                            <td className="px-3 py-2 text-foreground">{program.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{program.degree}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-foreground">
                              {program.intake}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {program.accredited ? (
                                <span className="text-emerald-300">Yes</span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <FileText className="h-3.5 w-3.5 text-indigo-300" /> Evidence dossier
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {verifiedFor(selected.id).length}/{selected.formData.documents.length} verified
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {selected.formData.documents.map((document) => {
                        const verified = verifiedFor(selected.id).includes(document.id);
                        const expanded = expandedDoc === document.id;
                        return (
                          <div
                            key={document.id}
                            className={cn(
                              "rounded-xl border transition-colors",
                              verified
                                ? "border-emerald-400/20 bg-emerald-400/[0.03]"
                                : "border-white/[0.07] bg-white/[0.02]",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedDoc(expanded ? null : document.id)}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <FileText className={cn("h-3.5 w-3.5 shrink-0", verified ? "text-emerald-400" : "text-muted-foreground")} />
                                <span className="min-w-0">
                                  <span className="block truncate text-[11px] text-foreground">
                                    {document.name}
                                  </span>
                                  <span className="block text-[9px] text-muted-foreground">
                                    {document.fileName} · {(document.sizeKb / 1024).toFixed(1)} MB
                                  </span>
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="hidden rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-muted-foreground sm:inline">
                                  {document.category}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                    expanded && "rotate-180",
                                  )}
                                />
                              </span>
                            </button>
                            <AnimatePresence initial={false}>
                              {expanded ? (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden border-t border-white/[0.06]"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                                    <p className="text-[10px] text-muted-foreground">
                                      Declared evidence for {document.category.toLowerCase()} compliance.
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={verified ? "success" : "secondary"}
                                      onClick={() => toggleDocument(selected.id, document.id)}
                                    >
                                      {verified ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3" /> Verified
                                        </>
                                      ) : (
                                        <>
                                          <Check className="h-3 w-3" /> Mark verified
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      <CalendarClock className="h-3 w-3" /> Audit trail
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {selected.auditLogs.slice(-4).reverse().map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 text-[10px]">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
                          <div className="min-w-0">
                            <p className="text-muted-foreground">
                              <span className="text-foreground">{entry.actorName}</span> →{" "}
                              {STATE_META[entry.newState].label}
                            </p>
                            <p className="truncate text-[9px] text-muted-foreground/70">
                              {entry.actionNotes}
                            </p>
                          </div>
                          <span className="ml-auto shrink-0 text-[8px] text-muted-foreground/60">
                            {formatDate(entry.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Select a file from the queue to begin scrutiny.
            </CardContent>
          </Card>
        )}
      </div>

      {selected && evaluation ? (
        <div className="space-y-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> Live rule verdict
              </CardTitle>
              <CardDescription>
                Recalculated from the submitted JSON payload.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center">
                <ComplianceGauge
                  score={evaluation.score}
                  size={148}
                  strokeWidth={9}
                  showRules={{ passed: evaluation.passedRules, total: evaluation.totalRules }}
                />
              </div>
              <SlaCountdown deadline={selected.slaDeadline} label="Stage SLA" />
              <RuleCheckList checks={evaluation.checks} compact />

              {openDeficiencies.length > 0 ? (
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium text-amber-200">
                    <FileWarning className="h-3 w-3" /> {openDeficiencies.length} open notice(s)
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {openDeficiencies.slice(0, 4).map((deficiency) => (
                      <li key={deficiency.id} className="text-[9px] leading-relaxed text-muted-foreground">
                        · {deficiency.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Gavel className="h-4 w-4 text-indigo-300" /> Scrutiny actions
              </CardTitle>
              <CardDescription>
                Transitions are validated against the workflow graph and your role.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {selected.currentState === "SUBMITTED" ? (
                <Button className="w-full" onClick={() => transition("UNDER_SCRUTINY")} loading={pending}>
                  <ClipboardCheck className="h-4 w-4" /> Claim & start scrutiny
                </Button>
              ) : null}

              {selected.currentState === "UNDER_SCRUTINY" ? (
                <>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => openDialog("flag")}
                  >
                    <FileWarning className="h-4 w-4 text-amber-300" /> Flag deficiency
                  </Button>
                  <Button className="w-full" onClick={() => transition("EVC_INSPECTION")} loading={pending}>
                    <Landmark className="h-4 w-4" /> Schedule EVC inspection
                  </Button>
                </>
              ) : null}

              {selected.currentState === "EVC_INSPECTION" ? (
                <>
                  <Button
                    className="w-full"
                    variant="success"
                    onClick={() => openDialog("decision", "APPROVED")}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve institution
                  </Button>
                  <Button
                    className="w-full"
                    variant="danger"
                    onClick={() => openDialog("decision", "REJECTED")}
                  >
                    <X className="h-4 w-4" /> Reject application
                  </Button>
                </>
              ) : null}

              {selected.currentState === "DEFICIENCY_NOTIFIED" ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-3 text-[10px] leading-relaxed text-muted-foreground">
                  Awaiting the institution&apos;s corrected resubmission. The remediation SLA is
                  tracked automatically.
                </div>
              ) : null}

              {selected.currentState === "APPROVED" || selected.currentState === "REJECTED" ? (
                <div
                  className={cn(
                    "rounded-xl border p-3 text-[10px] leading-relaxed",
                    selected.currentState === "APPROVED"
                      ? "border-emerald-400/25 bg-emerald-400/[0.05] text-emerald-200"
                      : "border-rose-400/25 bg-rose-500/[0.05] text-rose-200",
                  )}
                >
                  {selected.decisionNotes ?? "Final decision recorded."}
                </div>
              ) : null}

              {selected.currentState === "SUBMITTED" ? (
                <p className="px-1 text-[9px] leading-relaxed text-muted-foreground">
                  Claiming starts the 72-hour scrutiny SLA and locks the file to the desk.
                </p>
              ) : null}

              <div className="mt-1 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[9px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {evaluation.totalRules} rules evaluated
                </span>
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {selected.formData.documents.length} documents
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={dialog !== null} onOpenChange={(open) => (!open ? setDialog(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === "flag"
                ? "Issue show-cause notice"
                : dialog?.target === "APPROVED"
                  ? "Approve this institution"
                  : "Reject this application"}
            </DialogTitle>
            <DialogDescription>
              {dialog?.type === "flag"
                ? "The open rule gaps will be attached to a seven-day remediation window. The institution is notified immediately."
                : "This is a final, audited decision. The actor, timestamp and note are written to the immutable workflow log."}
            </DialogDescription>
          </DialogHeader>

          {dialog?.type === "flag" && evaluation ? (
            <div className="mb-3 max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5">
              {evaluation.deficiencies.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Automated validation passes all rules. Flagging manually will still create a
                  notice if a rule gap exists.
                </p>
              ) : (
                evaluation.deficiencies.map((deficiency) => (
                  <div key={deficiency.ruleCode} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      <span className="text-foreground">{deficiency.title}</span> — requires{" "}
                      {deficiency.requiredValue}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          <div>
            <Label htmlFor="reviewer-notes">Decision notes</Label>
            <Textarea
              id="reviewer-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Record the reasoning for the audit trail."
              className="mt-1.5"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={
                dialog?.type === "flag"
                  ? "secondary"
                  : dialog?.target === "APPROVED"
                    ? "success"
                    : "danger"
              }
              loading={pending}
              onClick={() => {
                if (!dialog) return;
                const target =
                  dialog.type === "flag" ? "DEFICIENCY_NOTIFIED" : dialog.target ?? "APPROVED";
                void transition(target, notes);
              }}
            >
              {dialog?.type === "flag" ? (
                <>
                  <FileWarning className="h-4 w-4" /> Dispatch notice
                </>
              ) : (
                <>
                  Confirm decision <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
      <p className="flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <Icon className="h-2.5 w-2.5" /> {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}
