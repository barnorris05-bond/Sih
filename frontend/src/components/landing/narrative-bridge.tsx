"use client";

import { motion, useReducedMotion, useTransform } from "framer-motion";
import { useRef } from "react";
import { useSectionProgress } from "@/lib/section-progress";

export function NarrativeBridge() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const scrollProgress = useSectionProgress(ref, Boolean(reduced));
  const beamX = useTransform(scrollProgress, [0, 1], ["18%", "82%"]);
  const beamOpacity = useTransform(scrollProgress, [0, .2, .8, 1], [0, .8, .8, 0]);
  return <section ref={ref} className="relative mx-auto w-full max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8" aria-label="Approval process transition">
    <div className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-[linear-gradient(120deg,rgba(41,35,74,.78),rgba(23,19,41,.94)_52%,rgba(118,103,200,.18))] px-6 py-16 text-center sm:px-12">
      <motion.div className="pointer-events-none absolute inset-y-0 w-72 -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(242,191,224,.28),transparent_68%)] blur-2xl" style={{ left: beamX, opacity: reduced ? .45 : beamOpacity }} />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(213,200,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(213,200,255,.12)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <p className="relative font-display text-4xl font-semibold tracking-[-.04em] text-foreground sm:text-6xl">Readiness is a process,<br /><span className="text-gradient">not a final score.</span></p>
      <p className="relative mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">Bring the people, evidence and decisions into one continuous view—then let each stage make the next one clearer.</p>
      <div className="relative mx-auto mt-8 flex max-w-md items-center justify-center gap-2 text-[9px] uppercase tracking-[.22em] text-muted-foreground"><span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#D5C8FF]/60" /> readiness → accountability <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#F2BFE0]/60" /></div>
    </div>
  </section>;
}
