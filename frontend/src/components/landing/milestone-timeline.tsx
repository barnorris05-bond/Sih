"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { useSectionProgress } from "@/lib/section-progress";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, Clock3, FileWarning } from "lucide-react";

const MILESTONES = [
  ["01", "Submission", "A complete institutional record enters the approval pipeline.", "Declared", CheckCircle2],
  ["02", "Validation", "Handbook constraints return explainable pass and fail findings.", "Rule check", CircleDashed],
  ["03", "Scrutiny", "A reviewer examines evidence and records structured observations.", "In review", Clock3],
  ["04", "Remediation", "The institution resolves a named deficiency with corrective evidence.", "Action owned", FileWarning],
  ["05", "Decision", "The completed trail supports a clear, reviewable outcome.", "Record ready", CheckCircle2],
] as const;

export function MilestoneTimeline() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const scrollProgress = useSectionProgress(sectionRef, Boolean(reduced));
  const pathScale = useTransform(scrollProgress, [0.1, .8], [0, 1]);
  const glowOpacity = useTransform(scrollProgress, [0, .35, 1], [0.15, .65, .15]);
  const [active, setActive] = useState(0);
  const move = (delta: number) => setActive((current) => Math.max(0, Math.min(MILESTONES.length - 1, current + delta)));
  const milestone = MILESTONES[active] ?? MILESTONES[0];
  const Icon = milestone[4];
  return <section ref={sectionRef} className="relative overflow-hidden border-y border-white/[0.06] bg-white/[0.018]"><motion.div className="pointer-events-none absolute left-[10%] right-[10%] top-1/2 hidden h-px origin-left bg-gradient-to-r from-[#A7A5F5] via-[#D5C8FF] to-[#F2BFE0] md:block" style={{ scaleX: reduced ? 1 : pathScale, opacity: reduced ? .5 : glowOpacity }} /><div className="relative mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">Milestones</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">A visible path from readiness to decision.</h2></div><div className="flex gap-2"><button type="button" onClick={() => move(-1)} disabled={active === 0} aria-label="Previous milestone" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground disabled:opacity-30"><ArrowLeft className="h-4 w-4" /></button><button type="button" onClick={() => move(1)} disabled={active === MILESTONES.length - 1} aria-label="Next milestone" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground disabled:opacity-30"><ArrowRight className="h-4 w-4" /></button></div></div><div className="relative mt-10 overflow-x-auto pb-2 scrollbar-none"><div className="flex min-w-max gap-3">{MILESTONES.map(([number, title], index) => <button key={title} type="button" onClick={() => setActive(index)} aria-current={active === index ? "step" : undefined} className={`relative z-10 w-[240px] rounded-2xl border p-5 text-left transition-all ${active === index ? "border-indigo-400/35 bg-indigo-500/10 shadow-glow-sm" : "border-white/[0.08] bg-[#171329]/80 hover:border-white/20"}`}><span className="font-mono text-[10px] text-indigo-200/75">{number}</span><h3 className="mt-8 font-display text-lg font-semibold text-foreground">{title}</h3><span className="mt-2 block text-[10px] text-muted-foreground">{active === index ? "Selected milestone" : "View milestone"}</span></button>)}</div></div><div className="mt-5 grid gap-5 rounded-2xl border border-white/[0.08] bg-[#29234a]/55 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] uppercase tracking-[0.18em] text-indigo-200/75">{milestone[3]}</p><p className="mt-1 text-sm text-foreground">{milestone[2]}</p></div><span className="font-mono text-xs text-muted-foreground">{active + 1} / {MILESTONES.length}</span></div></div></section>;
}
