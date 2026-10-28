"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Flame,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { springSoft } from "@/lib/motion";

const STATUTORY_METRICS = [
  { label: "Student-faculty ratio", actual: "1 : 18.0", required: "≤ 1:20", compliant: true },
  { label: "Cadre structure ratio", actual: "1 : 2 : 6", required: "1:2:6", compliant: true },
  { label: "Doctoral faculty percentage", actual: "46.2%", required: "≥ 20.0%", compliant: true },
  { label: "Instructional carpet area", actual: "2,140 m²", required: "≥ 2,250 m²", compliant: false },
];

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background illumination & structural radial highlights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-violet-500/15 via-sky-500/8 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-1/4 right-0 -z-10 h-[380px] w-[380px] rounded-full bg-sky-500/5 blur-[100px]" />

      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:px-8">
        {/* Left Column: Strategic Institutional Proposition */}
        <div>
          {/* Eyebrow badge */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3.5 py-1 text-[11px] font-medium tracking-wide text-violet-100 shadow-sm light:border-violet-300 light:bg-violet-500/10 light:text-violet-700"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-200 light:text-violet-700 shrink-0" />
            <span className="truncate">Problem Statement SIH26262 · Autonomous Regulatory Governance</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.08 }}
            className="mt-6 max-w-2xl font-display text-[2.15rem] font-bold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[4.25rem]"
          >
            Institutional governance,
            <span className="block text-gradient">automated end to end.</span>
          </motion.h1>

          {/* Body Narrative */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.16 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[17px]"
          >
            The AICTE Approval Cloud transforms the Approval Process Handbook into an
            executable state engine. Applications evaluate themselves against statutory norms,
            scrutiny is audited in real time, and SLA bottlenecks escalate automatically.
          </motion.p>

          {/* Dual Action CTAs */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3.5"
          >
            <Link href="/login">
              <Button size="lg" className="group h-12 px-6 text-sm font-semibold shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40">
                Enter the workspace
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#workflow">
              <Button size="lg" variant="secondary" className="h-12 border-white/10 bg-white/[0.04] px-6 text-sm font-medium hover:bg-white/[0.08]">
                See the workflow
              </Button>
            </a>
          </motion.div>

          {/* Institutional Trust Proof Points */}
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-white/[0.07] pt-6 text-xs font-medium text-slate-300 light:border-slate-200 light:text-slate-600"
          >
            <div className="flex items-center gap-2">                <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/10 text-emerald-400 light:text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span>6 statutory rules in code</span>
            </div>
            <div className="flex items-center gap-2">                <span className="grid h-6 w-6 place-items-center rounded-md bg-violet-500/10 text-violet-200 light:text-violet-700 light:text-violet-600">
                <Clock3 className="h-4 w-4" />
              </span>
              <span>Boundary-aware SLAs</span>
            </div>
            <div className="flex items-center gap-2">                <span className="grid h-6 w-6 place-items-center rounded-md bg-sky-500/10 text-sky-300 light:text-sky-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span>Immutable audit logs</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Live Institutional Console Preview */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...springSoft, delay: 0.2 }}
          className="relative mx-auto w-full max-w-[530px]"
        >
          {/* Main Console Box */}
          <motion.div
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="glass relative rounded-3xl border border-white/10 p-5 sm:p-6 shadow-[0_40px_120px_-40px_rgba(79,70,229,0.45)] backdrop-blur-2xl light:border-slate-200"
          >
            {/* Header / Institutional Identity */}
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="indigo" dot>Live Inspection Gate</Badge>
                  <span className="font-mono text-[10px] text-muted-foreground/80">Ref: SW-2026-4821</span>
                </div>
                <h3 className="mt-1.5 font-display text-base font-bold text-foreground">
                  Sundar Institute of Technology
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Permanent Campus · Southern Western Region
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 light:border-amber-300 light:bg-amber-400/15 light:text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  1 Action Required
                </span>
              </div>
            </div>

            {/* Score & Rule Verification Matrix */}
            <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-6">
              <ComplianceGauge score={92} size={138} strokeWidth={10} label="Live index" />

              <div className="space-y-1.5">
                {STATUTORY_METRICS.map((rule, idx) => (
                  <motion.div
                    key={rule.label}
                    initial={reduce ? false : { opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + idx * 0.08 }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{rule.label}</p>
                      <p className="font-mono text-[9px] text-muted-foreground">
                        {rule.actual} (Req. {rule.required})
                      </p>
                    </div>
                    {rule.compliant ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Deficit Alert Banner */}
            <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/[0.07] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-rose-200 light:text-rose-700">Instructional Area Deficiency</span>
                <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-rose-300 light:text-rose-700">
                  Critical Shortfall
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Declared: 2,140 m²</span>
                <span className="font-medium text-rose-300 light:text-rose-700">Shortfall: -110 m²</span>
                <span>Mandated: 2,250 m²</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400 w-[95%]" />
              </div>
            </div>

            {/* Bottom SLA Countdown Bar */}
            <div className="mt-3.5 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-amber-300 light:text-amber-700" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Remediation Cure Window
                </span>
              </div>
              <span className="font-mono text-xs font-semibold text-amber-300 light:text-amber-700">
                11d 14h 22m remaining
              </span>
            </div>
          </motion.div>

          {/* Floating Metric Badge */}
          <motion.div
            animate={reduce ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="glass absolute -bottom-6 -left-6 hidden w-48 rounded-2xl border border-white/10 p-3.5 shadow-2xl sm:block backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                SLA Engine
              </span>
              <Flame className="h-3 w-3 text-rose-400" />
            </div>
            <p className="mt-1 font-display text-2xl font-bold text-foreground">0 Breaches</p>
            <p className="mt-0.5 text-[9px] text-emerald-400">All regional desks on track</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
