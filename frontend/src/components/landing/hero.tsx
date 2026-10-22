"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { Button } from "@/components/ui/button";
import { springSoft } from "@/lib/motion";

const RULES = [
  { label: "Student-faculty ratio", value: "1 : 18", passed: true },
  { label: "Cadre structure", value: "1 : 2 : 6", passed: true },
  { label: "Doctoral faculty", value: "46%", passed: true },
  { label: "Instructional area", value: "2.4 sq.m / student", passed: false },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springSoft}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/[0.08] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-200"
          >
            <Sparkles className="h-3 w-3" />
            SIH26262 · Rule-driven governance
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.08 }}
            className="mt-6 max-w-2xl font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-6xl lg:text-[4.1rem]"
          >
            Institutional governance,
            <span className="block text-gradient">automated end to end.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.16 }}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground"
          >
            The AICTE Approval Cloud turns the Approval Process Handbook into a live
            calculation. Applications validate themselves, scrutiny runs on a guarded state
            machine, and SLA breaches escalate before they become bottlenecks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSoft, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/login">
              <Button size="lg" className="group">
                Enter the workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#workflow">
              <Button size="lg" variant="secondary">
                See the workflow
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> 6 statutory rules preloaded
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-indigo-300" /> Boundary-aware SLA engine
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-300" /> Full audit trail
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ ...springSoft, delay: 0.2, stiffness: 70 }}
          className="relative mx-auto w-full max-w-[480px]"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="glass relative rounded-3xl p-5 shadow-[0_50px_140px_-60px_rgba(56,189,248,0.55)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Application · 2026-27
                </p>
                <p className="mt-1 font-display text-sm font-semibold text-foreground">
                  Sundar Institute of Technology
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                <span className="h-1 w-1 rounded-full bg-amber-300" /> 1 gap
              </span>
            </div>

            <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
              <ComplianceGauge score={92} size={132} strokeWidth={9} label="Live index" />
              <div className="space-y-2">
                {RULES.map((rule, index) => (
                  <motion.div
                    key={rule.label}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.09 }}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-medium text-foreground">
                        {rule.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground">{rule.value}</p>
                    </div>
                    {rule.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/[0.06] p-3">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-medium text-rose-200">Instructional area shortfall</span>
                <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-rose-200">
                  Critical
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
                <span className="tabular-nums">Required 2,250 m²</span>
                <span className="h-2.5 w-px bg-white/15" />
                <span className="tabular-nums">Declared 2,140 m²</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "95%" }}
                  transition={{ duration: 1.3, delay: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
              <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Scrutiny SLA
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums text-amber-300">
                <Clock3 className="h-3 w-3" /> 34h 12m remaining
              </span>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="glass absolute -bottom-10 -left-6 hidden w-40 rounded-2xl p-3 sm:block"
          >
            <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              Auto-escalations
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-foreground">5</p>
            <p className="text-[9px] text-rose-300">SLA breached this cycle</p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
