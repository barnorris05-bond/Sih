"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowDownRight, ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

const LINKS = [
  "M470 300 C405 245 330 198 242 166",
  "M470 300 C390 300 308 300 196 302",
  "M470 300 C405 356 324 405 240 438",
  "M470 300 C530 244 603 206 690 184",
  "M470 300 C550 300 642 302 748 326",
  "M470 300 C534 360 614 407 694 448",
  "M470 300 C470 380 470 442 470 520",
];

const NODES = [
  { x: 242, y: 166, label: "IDENTITY", kind: "document" },
  { x: 196, y: 302, label: "EVIDENCE", kind: "document" },
  { x: 240, y: 438, label: "DECLARATION", kind: "document" },
  { x: 690, y: 184, label: "RULES", kind: "rule" },
  { x: 748, y: 326, label: "REVIEW", kind: "review" },
  { x: 694, y: 448, label: "INSPECT", kind: "review" },
  { x: 470, y: 520, label: "DECISION", kind: "decision" },
] as const;

function NetworkScene({ reduced, progress }: { reduced: boolean; progress: MotionValue<number> }) {
  const sceneOpacity = useTransform(progress, [0, .72, 1], [1, 1, .38]);
  const sceneScale = useTransform(progress, [0, 1], [1, 1.13]);
  const sceneY = useTransform(progress, [0, 1], [0, -42]);
  return <motion.div className="absolute inset-0" style={{ opacity: sceneOpacity, scale: sceneScale, y: sceneY }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_42%,rgba(242,191,224,.2),transparent_24%),radial-gradient(circle_at_78%_16%,rgba(118,103,200,.34),transparent_34%),linear-gradient(125deg,#171329_0%,#29234a_62%,#3b315f_100%)]" />
    <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(185,178,204,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(185,178,204,.1)_1px,transparent_1px)] [background-size:68px_68px] [mask-image:radial-gradient(ellipse_at_center,black_18%,transparent_76%)]" />
    <motion.div className="absolute -right-16 top-8 h-80 w-80 rounded-full bg-violet-500/20 blur-[90px]" animate={reduced ? undefined : { x: [0, -24, 0], y: [0, 18, 0], opacity: [.4, .7, .4] }} transition={reduced ? undefined : { duration: 12, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="absolute left-[14%] top-[45%] h-56 w-56 rounded-full bg-pink-300/10 blur-[80px]" animate={reduced ? undefined : { x: [0, 20, 0], y: [0, -16, 0], opacity: [.25, .55, .25] }} transition={reduced ? undefined : { duration: 9, repeat: Infinity, ease: "easeInOut" }} />
    <div className="absolute inset-x-[-10%] bottom-[-20%] h-[42%] bg-[linear-gradient(180deg,transparent,rgba(23,19,41,.92)),repeating-linear-gradient(90deg,transparent_0_80px,rgba(213,200,255,.1)_81px,transparent_82px)] opacity-70 [mask-image:linear-gradient(to_bottom,transparent,black_45%)]" />

    <svg viewBox="0 0 940 620" className="absolute inset-0 h-full w-full" role="img" aria-label="Connected approval network with evidence, rules, review and decision nodes">
      <defs>
        <radialGradient id="approval-core" cx="50%" cy="50%"><stop stopColor="#faf7ff" /><stop offset=".18" stopColor="#f2bfe0" /><stop offset=".55" stopColor="#a7a5f5" stopOpacity=".34" /><stop offset="1" stopColor="#a7a5f5" stopOpacity="0" /></radialGradient>
        <linearGradient id="approval-line" x1="0" x2="1"><stop stopColor="#d5c8ff" stopOpacity=".05" /><stop offset=".5" stopColor="#d5c8ff" stopOpacity=".9" /><stop offset="1" stopColor="#f2bfe0" stopOpacity=".25" /></linearGradient>
        <filter id="approval-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="approval-soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>
      <motion.ellipse cx="470" cy="300" rx="300" ry="126" fill="none" stroke="#f2bfe0" strokeOpacity=".3" strokeDasharray="2 18" strokeWidth="1" animate={reduced ? undefined : { rotate: 360 }} transition={reduced ? undefined : { duration: 38, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "470px 300px" }} />
      <motion.ellipse cx="470" cy="300" rx="218" ry="218" fill="none" stroke="#d5c8ff" strokeOpacity=".26" strokeDasharray="34 22" strokeWidth="1" animate={reduced ? undefined : { rotate: -360 }} transition={reduced ? undefined : { duration: 28, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "470px 300px" }} />
      <ellipse cx="470" cy="300" rx="350" ry="280" fill="none" stroke="#c8e5f8" strokeOpacity=".1" />
      {LINKS.map((path, index) => <g key={path}>
        <motion.path d={path} fill="none" stroke="url(#approval-line)" strokeWidth={index === 6 ? 2 : 1.2} strokeDasharray={index === 6 ? "0" : "4 11"} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: index < 3 ? .75 : .45 }} transition={{ duration: reduced ? .01 : .9, delay: reduced ? 0 : index * .08 }} />
        {!reduced ? <motion.circle r={index === 6 ? 4 : 3} fill={index < 3 ? "#f2bfe0" : "#a7a5f5"} filter="url(#approval-glow)" animate={{ offsetDistance: ["0%", "100%"] }} transition={{ duration: 4.2 + index * .35, repeat: Infinity, ease: "linear", delay: index * .5 }} style={{ offsetPath: `path('${path}')` }} /> : null}
      </g>)}
      {NODES.map((node, index) => <g key={node.label}>
        <circle cx={node.x} cy={node.y} r={node.kind === "decision" ? 31 : 23} fill={node.kind === "rule" ? "rgba(167,165,245,.14)" : "rgba(242,191,224,.1)"} stroke={node.kind === "rule" ? "#a7a5f5" : "#f2bfe0"} strokeOpacity={node.kind === "decision" ? .9 : .5} />
        <motion.circle cx={node.x} cy={node.y} r={node.kind === "decision" ? 10 : 7} fill={node.kind === "rule" ? "#a7a5f5" : "#f2bfe0"} filter="url(#approval-glow)" initial={{ opacity: .55, scale: 1 }} animate={reduced ? undefined : { scale: [1, 1.3, 1], opacity: [.55, 1, .55] }} transition={reduced ? undefined : { duration: 2.5 + index * .12, repeat: Infinity, ease: "easeInOut", delay: index * .18 }} style={{ transformOrigin: `${node.x}px ${node.y}px` }} />
        <text x={node.x} y={node.y + 48} textAnchor="middle" fill="#b9b2cc" fontSize="9" fontFamily="monospace" letterSpacing="1.5">{node.label}</text>
        {node.kind === "document" ? <><rect x={node.x - 6} y={node.y - 7} width="12" height="14" rx="2" fill="none" stroke="#faf7ff" strokeWidth="1" /><path d={`M${node.x - 3} ${node.y}h6M${node.x - 3} ${node.y + 3}h4`} stroke="#faf7ff" strokeWidth="1" /></> : null}
        {node.kind === "rule" ? <path d={`M${node.x - 6} ${node.y}l4 4 8-9`} fill="none" stroke="#171329" strokeWidth="2" strokeLinecap="round" /> : null}
      </g>)}
      <circle cx="470" cy="300" r="112" fill="url(#approval-core)" opacity=".18" filter="url(#approval-soft-glow)" />
      <motion.circle cx="470" cy="300" r="65" fill="none" stroke="#f2bfe0" strokeOpacity=".6" strokeWidth="1.5" strokeDasharray="18 16" animate={reduced ? undefined : { rotate: 360 }} transition={reduced ? undefined : { duration: 18, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "470px 300px" }} />
      <circle cx="470" cy="300" r="43" fill="rgba(23,19,41,.88)" stroke="#d5c8ff" strokeWidth="1.5" />
      <motion.circle cx="470" cy="300" r="35" fill="url(#approval-core)" initial={{ opacity: .72, scale: 1 }} animate={reduced ? undefined : { scale: [1, 1.08, 1], opacity: [.72, 1, .72] }} transition={reduced ? undefined : { duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "470px 300px" }} />
      <text x="470" y="296" textAnchor="middle" fill="#171329" fontSize="11" fontWeight="700" fontFamily="monospace">APP</text><text x="470" y="314" textAnchor="middle" fill="#171329" fontSize="8" fontFamily="monospace">2026—0148</text>
    </svg>
    <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between gap-6 sm:bottom-10 sm:left-12 sm:right-12"><div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-cyan-200/80">Approval universe / live model</p><p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-300/80">Evidence, rules, people and decisions remain connected in one accountable record.</p></div><div className="hidden text-right sm:block"><p className="font-mono text-[10px] text-slate-400">STAGE 01 / 06</p><p className="mt-1 text-xs text-cyan-100">Record forming</p></div></div>
  </motion.div>;
}

export function ApprovalUniverseHero() {
  const heroRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const staticProgress = useMotionValue(0);
  const scrollProgress = useMotionValue(0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = heroRef.current;
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const range = Math.max(1, element.offsetHeight - window.innerHeight);
        scrollProgress.set(Math.min(1, Math.max(0, -rect.top / range)));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [reduced, scrollProgress]);
  const progress = reduced ? staticProgress : scrollProgress;
  const pointerX = useSpring(useMotionValue(0), { stiffness: 80, damping: 22 });
  const pointerY = useSpring(useMotionValue(0), { stiffness: 80, damping: 22 });
  return <section ref={heroRef} style={{ position: "relative" }} className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden border-b border-white/[0.07] bg-[#07111F]" onPointerMove={(event) => { if (reduced) return; const rect = event.currentTarget.getBoundingClientRect(); pointerX.set((event.clientX - rect.left) / rect.width - .5); pointerY.set((event.clientY - rect.top) / rect.height - .5); }}>
    <motion.div className="absolute inset-0" style={{ x: useTransform(pointerX, [-.5, .5], [-12, 12]), y: useTransform(pointerY, [-.5, .5], [-8, 8]) }}><NetworkScene reduced={Boolean(reduced)} progress={progress} /></motion.div>
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,.96)_0%,rgba(7,17,31,.8)_28%,rgba(7,17,31,.2)_58%,rgba(7,17,31,.38)_100%)]" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,.25)_0%,transparent_58%,#07111f_100%)]" />
    <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-[1440px] items-center px-5 pb-24 pt-20 sm:px-8 lg:px-12"><div className="max-w-xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.28em] text-cyan-200/80"><span className="h-px w-8 bg-cyan-300/70" /> AICTE approval cloud <span className="text-slate-400/70">/ 2026—27</span></motion.div>
      <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .08 }} className="mt-7 max-w-2xl font-display text-[3.55rem] font-semibold leading-[.94] tracking-[-.06em] text-[#f3f7fc] sm:text-6xl lg:text-[5.8rem]">Every approval.<br /><span className="text-cyan-200">One connected journey.</span></motion.h1>
      <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: .18 }} className="mt-7 max-w-sm text-[15px] leading-7 text-[#a9b9cc]">From institutional submission to accountable decision, every step stays connected.</motion.p>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: .28 }} className="mt-8 flex flex-wrap gap-3"><Link href="/login"><Button size="lg" className="group bg-[#68e7e0] text-[#07111f] hover:bg-[#8af0ea]">Enter the workspace <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Button></Link><a href="#workflow"><Button size="lg" variant="secondary" className="border-white/15 bg-white/[.05] text-white hover:bg-white/[.1]">Explore the journey <ArrowDownRight className="h-4 w-4" /></Button></a></motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .55 }} className="mt-9 flex items-center gap-3 text-[10px] uppercase tracking-[.2em] text-slate-400"><ShieldCheck className="h-4 w-4 text-cyan-200" /> Shared record · accountable transitions</motion.div>
    </div></div>
    <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 text-[9px] uppercase tracking-[.25em] text-slate-400/80"><span className="h-8 w-px bg-gradient-to-b from-transparent to-cyan-300/80" /> scroll to enter the approval journey</div>
  </section>;
}
