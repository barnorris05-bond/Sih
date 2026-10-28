export type Tone = "orchid" | "cyan" | "lavender" | "amber" | "ice" | "emerald";

export interface StageMetric {
  label: string;
  value: string;
}

export interface Stage {
  label: string;
  actor: string;
  tone: Tone;
  /** The stage where the demo packet carries an open finding. */
  attention?: boolean;
  summary: string;
  metrics: [StageMetric, StageMetric, StageMetric];
  /** 0–1 value for the card's meter; simulated. */
  meter: number;
  meterLabel: string;
  packet: string;
}

export const TONE_HEX: Record<Tone, string> = {
  orchid: "#F2BFE0",
  cyan: "#7DE3F4",
  lavender: "#D5C8FF",
  amber: "#FBBF24",
  ice: "#C8E5F8",
  emerald: "#6EE7B7",
};

/** All figures below are simulated demonstration data. */
export const STAGES: Stage[] = [
  {
    label: "Declare",
    actor: "Institution",
    tone: "orchid",
    summary: "The institution builds its application in a guided wizard. Every field is scored as it is entered.",
    metrics: [
      { label: "Evidence items attached", value: "18 / 20" },
      { label: "Programmes declared", value: "7" },
      { label: "Draft saved", value: "2 min ago" },
    ],
    meter: 0.94,
    meterLabel: "Declaration completeness 94%",
    packet: "Draft assembled",
  },
  {
    label: "Auto-validate",
    actor: "Rule engine",
    tone: "cyan",
    summary: "Six handbook rules evaluate the submission before a human ever opens the file.",
    metrics: [
      { label: "Rules passed", value: "5 / 6" },
      { label: "Critical findings", value: "0" },
      { label: "Validation run", value: "1.4 s" },
    ],
    meter: 0.83,
    meterLabel: "Compliance index 83%",
    packet: "Validated, 1 warning",
  },
  {
    label: "Scrutinise",
    actor: "Scrutiny desk",
    tone: "lavender",
    summary: "Reviewers audit documents beside the rule verdict, with every note tied to its evidence.",
    metrics: [
      { label: "Documents verified", value: "18 / 20" },
      { label: "Queue position", value: "#4" },
      { label: "Review SLA remaining", value: "34 h" },
    ],
    meter: 0.9,
    meterLabel: "Documents verified 90%",
    packet: "Under scrutiny",
  },
  {
    label: "Remediate",
    actor: "Needs attention",
    tone: "amber",
    attention: true,
    summary: "A show-cause notice carries rule-level evidence and a running remediation window.",
    metrics: [
      { label: "Open findings", value: "1" },
      { label: "Window remaining", value: "14 days" },
      { label: "Corrective evidence", value: "Pending" },
    ],
    meter: 0.35,
    meterLabel: "Window elapsed 35%",
    packet: "Awaiting evidence",
  },
  {
    label: "Inspect",
    actor: "Expert committee",
    tone: "ice",
    summary: "An Expert Visit Committee is scheduled with a fresh SLA and the full audit context.",
    metrics: [
      { label: "Committee members", value: "3" },
      { label: "Visit window", value: "Week 2" },
      { label: "Audit entries carried", value: "42" },
    ],
    meter: 0.6,
    meterLabel: "Visit preparation 60%",
    packet: "Visit scheduled",
  },
  {
    label: "Decide",
    actor: "AICTE council",
    tone: "emerald",
    summary: "Approval issues a letter, and every transition stays in the immutable audit log.",
    metrics: [
      { label: "Decision", value: "Approved" },
      { label: "Approval letter", value: "Issued" },
      { label: "Audit log", value: "47 entries" },
    ],
    meter: 1,
    meterLabel: "Record complete 100%",
    packet: "Decision issued",
  },
];

export const STAGE_COUNT = STAGES.length;
