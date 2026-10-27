"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileCheck2, ScanLine } from "lucide-react";

const NODES = [
  { id: "institution", x: 360, y: 250, label: "APPLICATION", tone: "core" },
  { id: "identity", x: 150, y: 125, label: "IDENTITY", tone: "pink" },
  { id: "evidence", x: 145, y: 370, label: "EVIDENCE", tone: "pink" },
  { id: "rules", x: 565, y: 135, label: "RULES", tone: "violet" },
  { id: "review", x: 580, y: 365, label: "REVIEW", tone: "violet" },
  { id: "decision", x: 360, y: 438, label: "DECISION", tone: "lavender" },
] as const;

const STAGE_META = [
  ["01", "Record forming", "Institution data and evidence enter the application core."],
  ["02", "Rules in motion", "Connected requirements are checked against the declaration."],
  ["03", "Review network", "Evidence converges into a traceable scrutiny view."],
  ["04", "Path repaired", "The flagged evidence path reconnects for resubmission."],
  ["05", "Evaluation ready", "Criteria illuminate in sequence for inspection."],
  ["06", "Decision resolved", "The completed trail converges into an auditable record."],
] as const;

const LINKS = [[150, 125, 360, 250], [145, 370, 360, 250], [565, 135, 360, 250], [580, 365, 360, 250], [145, 370, 150, 125], [565, 135, 580, 365], [360, 250, 360, 438]];

export function ApprovalNetworkGraphic({ active }: { active: number }) {
  const reduced = useReducedMotion();
  const [number, title, description] = STAGE_META[active] ?? STAGE_META[0];
  const completion = Math.min(1, 0.16 + active * 0.16);
  return <div className="relative h-full min-h-[560px] overflow-hidden rounded-[1.5rem] border border-fuchsia-200/20 bg-[#29234a] shadow-[0_28px_90px_-35px_rgba(118,103,200,.5)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(242,191,224,.16),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(167,165,245,.18),transparent_32%)]" />
    <svg viewBox="0 0 720 520" role="img" aria-label={`${title}: ${description}`} className="absolute inset-0 h-full w-full">
      <defs><pattern id="approval-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="rgba(213,200,255,.1)" strokeWidth="1" /></pattern><filter id="node-glow"><feGaussianBlur stdDeviation="5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter><linearGradient id="link-gradient" x1="0" x2="1"><stop stopColor="#f2bfe0" stopOpacity=".08" /><stop offset=".5" stopColor="#d5c8ff" stopOpacity=".78" /><stop offset="1" stopColor="#a7a5f5" stopOpacity=".22" /></linearGradient></defs>
      <rect width="720" height="520" fill="url(#approval-grid)" opacity=".8" />
      <motion.g animate={{ rotate: active * 2 }} transition={{ duration: reduced ? 0 : .8 }} style={{ transformOrigin: "360px 250px" }}>
        <circle cx="360" cy="250" r="172" fill="none" stroke="rgba(242,191,224,.1)" strokeDasharray="2 12" /><circle cx="360" cy="250" r="114" fill="none" stroke="rgba(167,165,245,.16)" strokeDasharray="1 9" />
      </motion.g>
      <g>{LINKS.map(([x1, y1, x2, y2], index) => <motion.line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#link-gradient)" strokeWidth={index === 6 ? 2.5 : 1.5} strokeDasharray={index === active || index < active ? "0" : "5 10"} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: index <= active + 1 ? 1 : .25, opacity: index <= active + 1 ? .9 : .25 }} transition={{ duration: reduced ? .01 : .65, delay: reduced ? 0 : index * .04 }} />)}</g>
      <motion.circle cx="360" cy="250" r="75" fill="none" stroke="#f2bfe0" strokeWidth="1.5" strokeDasharray="18 24" animate={{ rotate: reduced ? 0 : 360 }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "360px 250px" }} opacity={active === 1 ? .95 : .35} />
      <motion.circle cx="360" cy="250" r="51" fill="rgba(242,191,224,.1)" stroke="rgba(213,200,255,.6)" strokeWidth="1" animate={{ scale: active === 5 ? 1.12 : 1 }} transition={{ duration: reduced ? 0 : .45 }} style={{ transformOrigin: "360px 250px" }} />
      {NODES.map((node, index) => { const activeNode = index === 0 || index <= active + 1; const flagged = active === 3 && node.id === "evidence"; return <g key={node.id}><motion.circle cx={node.x} cy={node.y} r={node.id === "institution" ? 28 : 18} fill={flagged ? "rgba(248,221,235,.2)" : node.tone === "violet" ? "rgba(167,165,245,.16)" : "rgba(242,191,224,.14)"} stroke={flagged ? "#f2bfe0" : node.id === "institution" ? "#d5c8ff" : node.tone === "violet" ? "#a7a5f5" : "rgba(242,191,224,.8)"} strokeWidth={node.id === "institution" ? 2 : 1.5} initial={{ opacity: activeNode ? 1 : .35, scale: activeNode ? 1 : .85 }} animate={{ opacity: activeNode ? 1 : .35, scale: activeNode ? 1 : .85 }} transition={{ duration: reduced ? .01 : .4 }} style={{ transformOrigin: `${node.x}px ${node.y}px` }} filter={activeNode ? "url(#node-glow)" : undefined} /><text x={node.x} y={node.y + 4} textAnchor="middle" fill={flagged ? "#f8ddeb" : "#faf7ff"} fontSize={node.id === "institution" ? 10 : 8} fontFamily="monospace" letterSpacing="1">{node.id === "institution" ? "APP" : index < 3 ? "DOC" : "✓"}</text><text x={node.x} y={node.y + (node.id === "institution" ? 50 : 38)} textAnchor="middle" fill="rgba(185,178,204,.8)" fontSize="9" fontFamily="monospace" letterSpacing="1">{node.label}</text></g>; })}
      {active === 1 ? <motion.path d="M65 250 A295 295 0 0 1 655 250" fill="none" stroke="#f2bfe0" strokeWidth="2" strokeDasharray="20 680" initial={{ strokeDashoffset: 700 }} animate={{ strokeDashoffset: 0 }} transition={{ duration: reduced ? .01 : 1.5, ease: "easeInOut" }} opacity=".9" /> : null}
      {active === 2 ? <motion.circle cx="580" cy="365" r="35" fill="none" stroke="#a7a5f5" strokeWidth="2" strokeDasharray="5 7" initial={{ scale: 1, opacity: .4 }} animate={{ scale: [1, 1.18, 1], opacity: [0.4, 1, .4] }} transition={{ duration: reduced ? .01 : 2, repeat: reduced ? 0 : Infinity }} style={{ transformOrigin: "580px 365px" }} /> : null}
      {active === 4 ? <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}><path d="M360 250L360 438" stroke="#d5c8ff" strokeWidth="3" /><circle cx="360" cy="438" r="24" fill="rgba(213,200,255,.16)" stroke="#d5c8ff" strokeWidth="2" /></motion.g> : null}
      {active === 5 ? <motion.g initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduced ? .01 : .5 }} style={{ transformOrigin: "360px 438px" }}><circle cx="360" cy="438" r="30" fill="rgba(242,191,224,.2)" stroke="#f2bfe0" strokeWidth="2" /><path d="M347 438l9 9 18-20" fill="none" stroke="#faf7ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></motion.g> : null}
    </svg>
    <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-[#171329]/85 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100 backdrop-blur"><ScanLine className="h-3.5 w-3.5" /> Approval network <span className="text-white/35">/</span> live view</div>
    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] text-cyan-200/80">{number} / 06 · {title}</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-300">{description}</p></div><div className="hidden items-center gap-2 sm:flex"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full bg-cyan-300" animate={{ width: `${completion * 100}%` }} transition={{ duration: reduced ? .01 : .45 }} /></div><span className="font-mono text-[10px] text-slate-400">{Math.round(completion * 100)}%</span></div></div>
    <div className="absolute right-5 top-5 hidden items-center gap-2 text-[9px] text-slate-400 sm:flex"><FileCheck2 className="h-3.5 w-3.5 text-cyan-200" /> APP-2026-0148 <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /></div>
  </div>;
}
