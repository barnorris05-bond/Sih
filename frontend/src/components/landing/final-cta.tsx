"use client";

import Link from "next/link";
import { motion, useReducedMotion, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useSectionProgress } from "@/lib/section-progress";

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const scrollProgress = useSectionProgress(ref, Boolean(reduced));
  const position = useTransform(scrollProgress, [0, 1], ["0% 50%", "100% 50%"]);
  const glow = useTransform(scrollProgress, [0, .5, 1], [.35, .75, .35]);
  return <section ref={ref} className="mx-auto w-full max-w-[1440px] px-4 pb-20 sm:px-6 lg:px-8">
    <motion.div className="relative overflow-hidden rounded-[2rem] border border-[#D5C8FF]/25 p-8 sm:p-12" style={{ backgroundImage: "linear-gradient(120deg,#7667C8 0%,#29234A 38%,#F2BFE0 78%,#C8E5F8 100%)", backgroundSize: "180% 180%", backgroundPosition: reduced ? "50% 50%" : position }}>
      <motion.div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#FAF7FF]/30 blur-[100px]" style={{ opacity: reduced ? .35 : glow }} />
      <div className="pointer-events-none absolute inset-0 bg-[#171329]/35" />
      <div className="relative max-w-2xl"><Badge variant="indigo" dot>Demonstration environment</Badge><h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[#FAF7FF] sm:text-4xl">Make the next approval easier to understand.</h2><p className="mt-4 text-sm leading-relaxed text-[#F8DDEB]/90">Enter the portal to explore the seeded workflow, or start with the role that owns your next action.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/login" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FAF7FF] px-5 text-sm font-medium text-[#171329] shadow-[0_18px_40px_-20px_rgba(23,19,41,.8)] transition-transform hover:-translate-y-0.5">Open the portal <ArrowRight className="h-4 w-4" /></Link><a href="#workflow" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#FAF7FF]/35 bg-[#171329]/20 px-5 text-sm font-medium text-[#FAF7FF] hover:bg-[#171329]/35">Review the workflow <ArrowDownRight className="h-4 w-4" /></a></div></div>
    </motion.div>
  </section>;
}
