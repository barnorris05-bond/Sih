import { STATE_META, type ApplicationState, type Severity } from "@aicte/shared";

export const SEVERITY_STYLES: Record<
  Severity,
  { label: string; className: string; dot: string; chart: string }
> = {
  LOW: {
    label: "Low",
    className: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    dot: "bg-sky-400",
    chart: "#38bdf8",
  },
  MEDIUM: {
    label: "Medium",
    className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
    chart: "#fbbf24",
  },
  HIGH: {
    label: "High",
    className: "border-orange-400/30 bg-orange-400/10 text-orange-300",
    dot: "bg-orange-400",
    chart: "#fb923c",
  },
  CRITICAL: {
    label: "Critical",
    className: "border-rose-400/40 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
    chart: "#fb7185",
  },
};

export const STATE_STYLES: Record<ApplicationState, string> = {
  DRAFT: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  SUBMITTED: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  RULE_VALIDATION_FAILED: "border-rose-400/40 bg-rose-500/10 text-rose-300",
  UNDER_SCRUTINY: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  DEFICIENCY_NOTIFIED: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  EVC_INSPECTION: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  APPROVED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  REJECTED: "border-rose-400/40 bg-rose-500/10 text-rose-300",
};

export function stateLabel(state: ApplicationState): string {
  return STATE_META[state].label;
}

export function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 90) return "success";
  if (score >= 65) return "warning";
  return "danger";
}

export const SCORE_COLORS = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
} as const;

export const CHART_PALETTE = [
  "#818cf8",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#c084fc",
];
