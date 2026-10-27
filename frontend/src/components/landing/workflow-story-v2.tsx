"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { AlertTriangle, ClipboardCheck, FileText, Gavel, Landmark, ScanLine } from "lucide-react";
import { ApprovalNetworkGraphic } from "@/components/landing/approval-network-graphic";

const stages = [
  ["Declare", "Institution workspace", "Build a complete application record with institution details, programmes and evidence.", FileText, "Application draft · 84% complete"],
  ["Auto-validate", "Rule engine", "Run handbook checks before scrutiny with thresholds and next actions in view.", ScanLine, "5 of 6 rules passed"],
  ["Scrutinise", "Review desk", "Inspect declarations and documents together, then record findings with accountable notes.", ClipboardCheck, "Evidence review in progress"],
  ["Remediate", "Institution response", "Turn a deficiency into an owned task with corrective evidence and a clear next step.", AlertTriangle, "Instructional area · high"],
  ["Inspect", "Evaluation", "Keep inspection context connected to the application from assignment through findings.", Landmark, "EVC visit · context attached"],
  ["Decide", "Decision record", "Show the outcome alongside completed stages, disposition notes and audit history.", Gavel, "Decision packet ready"],
] as const;

export function WorkflowStory() {
  const [active, setActive] = useState(0);
  const stageRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [title] = stages[active] ?? stages[0];

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (!visible) return;
      const index = Number((visible.target as HTMLElement).dataset.stageIndex);
      if (Number.isFinite(index)) setActive(index);
    }, { rootMargin: "-38% 0px -48%", threshold: 0.01 });
    stageRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <section id="workflow" className="mx-auto w-full max-w-[1440px] scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-indigo-300/80">The approval journey</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Six stages. One accountable thread.</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">Move from a structured declaration to a documented decision without losing context between teams.</p>
          <div className="mt-8 grid gap-2" role="tablist" aria-label="Approval workflow stages">
            {stages.map(([name, stageKicker], index) => (
              <button key={name} ref={(element) => { stageRefs.current[index] = element; }} data-stage-index={index} type="button" role="tab" aria-selected={active === index} aria-controls="workflow-panel" onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); const next = (index + 1) % stages.length; setActive(next); stageRefs.current[next]?.focus(); } if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); const previous = (index - 1 + stages.length) % stages.length; setActive(previous); stageRefs.current[previous]?.focus(); } }} onClick={() => setActive(index)} className={`flex min-h-24 items-center gap-3 rounded-xl border px-3 py-3 text-left ${active === index ? "border-indigo-400/35 bg-indigo-500/10" : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"}`}>
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${active === index ? "bg-indigo-400/15 text-indigo-200" : "bg-white/[0.05] text-muted-foreground"}`}><span className="text-[10px] font-semibold">{String(index + 1).padStart(2, "0")}</span></span>
                <span className="min-w-0 flex-1"><span className={`block text-xs font-semibold ${active === index ? "text-foreground" : "text-muted-foreground"}`}>{name}</span><span className="mt-0.5 block text-[10px] text-muted-foreground/70">{stageKicker}</span></span>
                <ArrowRight className={`h-3.5 w-3.5 ${active === index ? "text-indigo-300" : "text-transparent"}`} />
              </button>
            ))}
          </div>
        </div>
        <div id="workflow-panel" role="tabpanel" aria-label={`${title} stage`} className="relative min-h-[560px] overflow-hidden sm:sticky sm:top-24 lg:top-28">
          <ApprovalNetworkGraphic active={active} />
          <div className="relative mt-5 flex items-center justify-between text-[10px] text-muted-foreground"><span>Stage {active + 1} of {stages.length}</span><div className="flex gap-1.5">{stages.map(([name], index) => <button key={name} type="button" aria-label={`Show ${name} stage`} onClick={() => setActive(index)} className={`h-1.5 rounded-full ${active === index ? "w-7 bg-indigo-300" : "w-1.5 bg-white/20"}`} />)}</div></div>
        </div>
      </div>
    </section>
  );
}
