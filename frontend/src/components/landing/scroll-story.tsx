"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  FileWarning,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComplianceGauge } from "@/components/dashboard/compliance-gauge";
import { cn } from "@/lib/utils";

// Six canonical stages strictly preserving domain metadata and titles
export const STORY_STAGES = [
  {
    id: "declare",
    number: "01",
    title: "Declare",
    subtitle: "Application Assembly",
    badge: "Live scoring",
    icon: Building2,
    body: "Institutions build the application in a guided wizard with live scoring on every field.",
    accent: "indigo",
  },
  {
    id: "auto-validate",
    number: "02",
    title: "Auto-validate",
    subtitle: "Handbook Engine",
    badge: "Deterministic",
    icon: ScanLine,
    body: "Six handbook rules evaluate the JSON payload before a human ever opens the file.",
    accent: "sky",
  },
  {
    id: "scrutinise",
    number: "03",
    title: "Scrutinise",
    subtitle: "Desk Audit & Evidence",
    badge: "Human audit",
    icon: ClipboardCheck,
    body: "The scrutiny desk audits documents side-by-side with the rule verdict.",
    accent: "amber",
  },
  {
    id: "remediate",
    number: "04",
    title: "Remediate",
    subtitle: "Deficiency Resolution",
    badge: "SLA tracked",
    icon: FileWarning,
    body: "Show-cause notices carry rule-level evidence and a ticking remediation window.",
    accent: "rose",
  },
  {
    id: "inspect",
    number: "05",
    title: "Inspect",
    subtitle: "EVC On-Site Inspection",
    badge: "Physical audit",
    icon: Landmark,
    body: "Expert Visit Committees are scheduled with a fresh SLA and full audit context.",
    accent: "violet",
  },
  {
    id: "decide",
    number: "06",
    title: "Decide",
    subtitle: "Executive Order & Audit",
    badge: "Immutable",
    icon: CheckCircle2,
    body: "Approvals issue a letter; every transition stays immutable in the audit log.",
    accent: "emerald",
  },
] as const;

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  // Scroll progress calculation using relative travel distance and sticky header offset
  const updateScrollProgress = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;

    const rect = section.getBoundingClientRect();
    const stickyTop = window.innerWidth >= 768 ? 80 : 64;
    const viewportHeight = window.innerHeight;
    const totalTravel = section.offsetHeight - viewportHeight;

    if (totalTravel <= 0) return;

    // Traveled distance from when the section top reaches the sticky top offset
    const traveled = -rect.top + stickyTop;
    const effectiveTravel = totalTravel + stickyTop;
    const rawProgress = traveled / effectiveTravel;
    const progress = Math.min(1, Math.max(0, rawProgress));

    // Update continuous CSS variable for GPU-accelerated progress line animation
    section.style.setProperty("--story-progress", progress.toFixed(4));

    // Discrete mapping to 6 stages [0..5]
    const stageCount = STORY_STAGES.length;
    const newIndex = Math.min(stageCount - 1, Math.floor(progress * stageCount));

    if (newIndex !== activeIndexRef.current) {
      activeIndexRef.current = newIndex;
      setActiveIndex(newIndex);
    }
  }, []);

  // Programmatic manual selection with smooth scroll synchronization
  const handleSelectStage = useCallback(
    (index: number) => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const stickyTop = window.innerWidth >= 768 ? 80 : 64;
      const viewportHeight = window.innerHeight;
      const totalTravel = section.offsetHeight - viewportHeight;

      if (totalTravel <= 0) return;

      const stageCount = STORY_STAGES.length;
      // Position target at the comfortable entry of stage interval
      const targetProgress = (index + 0.3) / stageCount;
      const effectiveTravel = totalTravel + stickyTop;
      const targetTraveled = targetProgress * effectiveTravel;
      const sectionDocTop = rect.top + window.scrollY;
      const targetScrollY = sectionDocTop - stickyTop + targetTraveled;

      activeIndexRef.current = index;
      setActiveIndex(index);

      window.scrollTo({
        top: targetScrollY,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [prefersReducedMotion],
  );

  // Keyboard navigation within the tablist
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const stageCount = STORY_STAGES.length;
    let nextIndex = currentIndex;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % stageCount;
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + stageCount) % stageCount;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = stageCount - 1;
    }

    if (nextIndex !== currentIndex) {
      handleSelectStage(nextIndex);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  // Scroll and resize listener lifecycle
  useEffect(() => {
    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateScrollProgress();
        rafId = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Initial measurement
    updateScrollProgress();

    // Use ResizeObserver to detect layout / dynamic dimension changes
    const section = sectionRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (section && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        onScroll();
      });
      resizeObserver.observe(section);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (resizeObserver) resizeObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [updateScrollProgress]);

  const currentStage = STORY_STAGES[activeIndex] ?? STORY_STAGES[0];

  return (
    <section
      id="workflow"
      ref={sectionRef}
      className="scroll-story relative w-full border-t border-white/10 bg-slate-950/40 scroll-mt-20 min-h-[340vh] lg:min-h-[400vh]"
      aria-label="Six-stage approval workflow"
    >
      {/* Sticky Presentation Stage: Bounded completely inside the parent section */}
      <div
        ref={stickyRef}
        className="sticky top-16 md:top-20 z-20 flex h-[calc(100svh-4rem)] md:h-[calc(100svh-5rem)] w-full items-center justify-center overflow-hidden"
      >
        <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col justify-center px-4 py-4 sm:px-6 md:py-6 lg:px-8">
          {/* Section Eyebrow & Title */}
          <div className="mb-4 flex flex-col justify-between gap-2 border-b border-white/10 pb-3 md:mb-6 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200 light:text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  State Machine · 6 Stages
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  Scroll or select to explore
                </span>
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                One state machine. Zero paper chases.
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono text-violet-200 light:text-violet-700 font-semibold">{currentStage.number}</span>
              <span>/</span>
              <span className="font-mono">06</span>
              <span className="hidden sm:inline font-medium text-foreground/80">— {currentStage.title}</span>
            </div>
          </div>

          {/* Main 2-Column Responsive Layout */}
          <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)] lg:gap-8">
            {/* Left Column: Navigation Tablist & Progress Track */}
            <div className="flex flex-col justify-between">
              {/* Desktop Vertical Tablist */}
              <div
                role="tablist"
                aria-label="Workflow stages"
                aria-orientation="vertical"
                className="relative hidden space-y-2 lg:block"
              >
                {/* Continuous Background Progress Line */}
                <div
                  aria-hidden="true"
                  className="absolute left-6 top-4 bottom-4 w-0.5 rounded-full bg-white/[0.08]"
                >
                  <div
                    className="w-full origin-top rounded-full bg-gradient-to-b from-violet-500 via-sky-400 to-emerald-400 transition-transform duration-75"
                    style={{
                      height: "100%",
                      transform: "scaleY(var(--story-progress, 0))",
                    }}
                  />
                </div>

                {STORY_STAGES.map((stage, idx) => {
                  const isActive = activeIndex === idx;
                  const isPassed = activeIndex > idx;
                  const Icon = stage.icon;

                  return (
                    <button
                      key={stage.id}
                      ref={(el) => {
                        tabRefs.current[idx] = el;
                      }}
                      role="tab"
                      id={`workflow-tab-${idx}`}
                      aria-selected={isActive}
                      aria-controls={`workflow-panel-${idx}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => handleSelectStage(idx)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className={cn(
                        "group relative flex w-full items-start gap-4 rounded-xl border p-3.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                        isActive
                          ? "border-violet-400/40 bg-violet-500/[0.08] shadow-[0_8px_30px_-12px_rgba(99,102,241,0.5)]"
                          : isPassed
                            ? "border-white/10 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.03]"
                            : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.03]",
                      )}
                    >
                      {/* Step Marker Node */}
                      <span
                        className={cn(
                          "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg border font-mono text-xs transition-colors",
                          isActive
                            ? "border-violet-400/50 bg-violet-500/20 text-violet-100 light:text-violet-700 shadow-sm shadow-violet-500/40"
                            : isPassed
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300 light:text-emerald-700"
                              : "border-white/10 bg-slate-900/90 text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        {isPassed ? <Check className="h-3.5 w-3.5" /> : stage.number}
                      </span>

                      {/* Content Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                isActive
                                  ? "text-violet-200 light:text-violet-700"
                                  : isPassed
                                    ? "text-emerald-400/70"
                                    : "text-muted-foreground",
                              )}
                            />
                            <h3
                              className={cn(
                                "font-display text-sm font-semibold tracking-tight transition-colors",
                                isActive
                                  ? "text-foreground"
                                  : isPassed
                                    ? "text-foreground/80"
                                    : "text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {stage.title}
                            </h3>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                              isActive
                                ? "border-violet-400/30 bg-violet-400/15 text-violet-100 light:text-violet-700"
                                : "border-white/5 bg-white/[0.04] text-muted-foreground/60",
                            )}
                          >
                            {stage.badge}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-xs leading-relaxed transition-colors line-clamp-2",
                            isActive ? "text-muted-foreground" : "text-muted-foreground/70",
                          )}
                        >
                          {stage.body}
                        </p>
                      </div>

                      {/* Active Left Indicator Bar */}
                      {isActive && (
                        <motion.span
                          layoutId="active-tab-indicator"
                          className="absolute -left-px inset-y-2 w-1 rounded-r bg-violet-400"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mobile / Tablet Horizontal Stepper */}
              <div className="lg:hidden space-y-2">
                <div
                  role="tablist"
                  aria-label="Workflow stages"
                  className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                >
                  {STORY_STAGES.map((stage, idx) => {
                    const isActive = activeIndex === idx;
                    const isPassed = activeIndex > idx;
                    return (
                      <button
                        key={stage.id}
                        role="tab"
                        id={`workflow-mobile-tab-${idx}`}
                        aria-selected={isActive}
                        aria-controls={`workflow-panel-${idx}`}
                        onClick={() => handleSelectStage(idx)}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-violet-400",
                          isActive
                            ? "border-violet-400/50 bg-violet-500/20 text-violet-100 light:text-violet-700"
                            : isPassed
                              ? "border-white/10 bg-white/[0.03] text-foreground/80"
                              : "border-transparent text-muted-foreground",
                        )}
                      >
                        <span className="font-mono text-[10px]">{stage.number}</span>
                        <span>{stage.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{currentStage.title}</span>
                    <span className="text-[10px] text-violet-200 light:text-violet-700 font-mono">
                      {currentStage.subtitle}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {currentStage.body}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Contextual Miniature Demonstration UI */}
            <div className="relative min-h-[360px] sm:min-h-[420px] md:min-h-[460px] lg:min-h-[500px] w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  role="tabpanel"
                  id={`workflow-panel-${activeIndex}`}
                  aria-labelledby={`workflow-tab-${activeIndex}`}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                  animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: "easeInOut" }}
                  className="glass-strong h-full w-full rounded-2xl border border-white/[0.09] p-4 sm:p-5 shadow-2xl relative overflow-y-auto lg:overflow-hidden flex flex-col justify-between scrollbar-none"
                >
                  {/* Stage Visual Content Switcher */}
                  {activeIndex === 0 && <StageDeclarePreview />}
                  {activeIndex === 1 && <StageAutoValidatePreview />}
                  {activeIndex === 2 && <StageScrutinisePreview />}
                  {activeIndex === 3 && <StageRemediatePreview />}
                  {activeIndex === 4 && <StageInspectPreview />}
                  {activeIndex === 5 && <StageDecidePreview />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================
// STAGE 1: DECLARE PREVIEW
// ==========================================
function StageDeclarePreview() {
  return (
    <div className="space-y-3.5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-violet-500/20 text-violet-200 light:text-violet-700">
              <Building2 className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Sundar Institute of Technology
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Application ID: AICTE-2026-SW-0482 · South Western Region
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="indigo" dot>
            Draft · Auto-saving
          </Badge>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
            2026-27 Cycle
          </span>
        </div>
      </div>

      {/* Guided Wizard Steps */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { name: "1. Campus", status: "Verified", complete: true },
          { name: "2. Programmes", status: "Verified", complete: true },
          { name: "3. Faculty", status: "In progress", active: true },
          { name: "4. Infra & Land", status: "Pending", pending: true },
        ].map((step, idx) => (
          <div
            key={idx}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-center transition-colors",
              step.complete
                ? "border-emerald-400/20 bg-emerald-500/[0.05] text-emerald-300 light:text-emerald-700"
                : step.active
                  ? "border-violet-400/40 bg-violet-500/10 text-violet-100 light:text-violet-700"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground/60",
            )}
          >
            <p className="truncate text-[10px] font-semibold">{step.name}</p>
            <p className="text-[8px] opacity-75">{step.status}</p>
          </div>
        ))}
      </div>

      {/* Structured Input Fields & Live Scoring Indicators */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Live Faculty & Intake Scoring</span>
          <span className="text-[10px] font-mono text-emerald-300 light:text-emerald-700">SFR Target 1:20 (Declared 1:17.1)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Sanctioned Intake</span>
            <p className="font-display text-base font-semibold text-foreground mt-0.5">720</p>
            <span className="text-[8px] text-muted-foreground">4 B.Tech + 2 M.Tech</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Faculty Required</span>
            <p className="font-display text-base font-semibold text-violet-200 light:text-violet-700 mt-0.5">40</p>
            <span className="text-[8px] text-emerald-400">42 Declared</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Cadre Ratio</span>
            <p className="font-display text-base font-semibold text-foreground mt-0.5">1:2:6</p>
            <span className="text-[8px] text-emerald-400">Compliant</span>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Campus Land</span>
            <p className="font-display text-base font-semibold text-foreground mt-0.5">5.20 Ac</p>
            <span className="text-[8px] text-emerald-400">Req. 5.00 Ac</span>
          </div>
        </div>

        {/* Live Validation Alert */}
        <div className="flex items-center justify-between rounded-lg border border-emerald-400/25 bg-emerald-500/[0.06] px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-emerald-200 light:text-emerald-700">
              Form inputs comply with Approval Process Handbook 2026 schema validation.
            </span>
          </div>
          <span className="font-mono text-[9px] text-emerald-300 light:text-emerald-700 shrink-0 font-semibold">100% VALID</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STAGE 2: AUTO-VALIDATE PREVIEW
// ==========================================
function StageAutoValidatePreview() {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-sky-500/20 text-sky-300 light:text-sky-700">
              <ScanLine className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Automated Statutory Rule Engine
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Pre-scrutiny JSON execution · 6 statutory rules evaluated in 14ms
          </p>
        </div>
        <Badge variant="warning" dot>
          1 Deficiency Flagged
        </Badge>
      </div>

      {/* Score & Summary Grid */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
        <ComplianceGauge score={92} size={118} strokeWidth={8} label="Live index" />
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Handbook Rules Cleared</span>
            <span className="font-semibold text-foreground">5 / 6 rules</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-400 w-[92%]" />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
            <div>
              <p className="text-muted-foreground">Cycle Time</p>
              <p className="font-mono font-medium text-foreground">14ms pre-flight</p>
            </div>
            <div>
              <p className="text-muted-foreground">Handbook Version</p>
              <p className="font-mono font-medium text-violet-200 light:text-violet-700">APH 2026-27 v1.2</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Mini List */}
      <div className="space-y-1.5">
        {[
          { code: "APH_2026_SFR", name: "Student-faculty ratio (1:18)", passed: true, val: "1 : 17.1" },
          { code: "APH_2026_CADRE", name: "Cadre structure (1:2:6)", passed: true, val: "1 : 2.25 : 7.25" },
          { code: "APH_2026_AREA", name: "Instructional area (2,250 m²)", passed: false, val: "2,140 m² (-110 m²)" },
          { code: "APH_2026_LAND", name: "Land parcel title (5.0 Ac)", passed: true, val: "5.20 Acres" },
        ].map((rule) => (
          <div
            key={rule.code}
            className={cn(
              "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs",
              rule.passed
                ? "border-white/10 bg-white/[0.03]"
                : "border-rose-400/30 bg-rose-500/[0.06]",
            )}
          >
            <div className="flex items-center gap-2 truncate">
              {rule.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              )}
              <span className="font-medium text-foreground truncate text-[11px]">{rule.name}</span>
            </div>
            <span
              className={cn(
                "font-mono text-[10px] shrink-0 font-medium",
                rule.passed ? "text-emerald-300 light:text-emerald-700" : "text-rose-300 light:text-rose-700",
              )}
            >
              {rule.val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// STAGE 3: SCRUTINISE PREVIEW
// ==========================================
function StageScrutinisePreview() {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-500/20 text-amber-300 light:text-amber-700">
              <ClipboardCheck className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Regional Scrutiny Desk
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Desk Auditor #04 · File: AICTE-2026-SW-0482 · Side-by-side verification
          </p>
        </div>
        <Badge variant="warning" dot>
          Under Scrutiny
        </Badge>
      </div>

      {/* Evidence & Document Verification Rows */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Document Verification Checklist
        </p>
        {[
          { name: "Registered Land Deed (48 pages)", status: "VERIFIED", hash: "SHA256: 0x9a8f...4e1b", ok: true },
          { name: "AICTE Form-1 Affidavit", status: "VERIFIED", hash: "Notarized by Reg. RO", ok: true },
          { name: "Structural & Fire Safety NOC", status: "VERIFIED", hash: "Valid till 2028-03", ok: true },
          { name: "Building Plan & Area Allocation", status: "DEFICIENT", hash: "110 m² deficit verified", ok: false },
        ].map((doc, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between rounded-lg border p-2 text-xs",
              doc.ok
                ? "border-white/10 bg-white/[0.04]"
                : "border-amber-400/30 bg-amber-500/[0.06]",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileCheck2
                className={cn("h-4 w-4 shrink-0", doc.ok ? "text-emerald-400" : "text-amber-400")}
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-foreground">{doc.name}</p>
                <p className="text-[9px] font-mono text-muted-foreground truncate">{doc.hash}</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold shrink-0",
                doc.ok ? "bg-emerald-400/10 text-emerald-300 light:text-emerald-700" : "bg-amber-400/15 text-amber-300 light:text-amber-700",
              )}
            >
              {doc.status}
            </span>
          </div>
        ))}
      </div>

      {/* Auditor Note & Action Bar */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Scrutiny Verdict: </span>
          Area shortfall of 110 m² confirmed against floor diagrams. Forwarded to deficiency queue for show-cause issuance.
        </p>
        <div className="mt-2 flex items-center justify-end gap-2 pt-1 border-t border-white/10">
          <span className="text-[9px] font-mono text-muted-foreground">Action:</span>
          <span className="rounded-md bg-amber-500/10 border border-amber-400/30 px-2 py-0.5 text-[9px] font-semibold text-amber-300 light:text-amber-700">
            Issue Show-Cause Notice
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STAGE 4: REMEDIATE PREVIEW
// ==========================================
function StageRemediatePreview() {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-rose-500/20 text-rose-300 light:text-rose-700">
              <FileWarning className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Institutional Remediation Desk
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Deficiency Notice SCN-2026-SW-019 · Clause 4.2 Remediation
          </p>
        </div>
        <Badge variant="danger" dot>
          Remediation Active
        </Badge>
      </div>

      {/* SLA Window Countdown Banner */}
      <div className="rounded-xl border border-rose-400/30 bg-rose-500/[0.08] p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-rose-200 light:text-rose-700">Statutory SLA Window</span>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-300 light:text-amber-700 sla-pulse">
            <Clock3 className="h-3.5 w-3.5" /> 11d : 14h : 22m remaining
          </span>
        </div>
        <p className="mt-1 text-[10px] text-rose-200/80">
          Remediation deadline: 14 calendar days from notice issuance. Auto-escalation enabled.
        </p>
      </div>

      {/* Cure Evidence Uploads */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Remediation Evidence Uploads
        </p>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.04] p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-200 light:text-violet-700" />
              <span className="text-[11px] font-medium text-foreground">
                Block_C_Instructional_Allocation_Plan.pdf
              </span>
            </div>
            <span className="font-mono text-[9px] text-emerald-300 light:text-emerald-700">2.4 MB · Uploaded</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[11px] font-medium text-foreground">
                Chartered_Architect_Reallocation_Affidavit.pdf
              </span>
            </div>
            <span className="font-mono text-[9px] text-emerald-300 light:text-emerald-700">1.1 MB · Uploaded</span>
          </div>
        </div>
      </div>

      {/* Recalculated Resolution State */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] p-3 text-xs">
        <div>
          <p className="text-[11px] font-semibold text-emerald-200 light:text-emerald-700">
            Recalculated Area: 2,280 m² (Meets 2,250 m² threshold)
          </p>
          <p className="text-[9px] text-muted-foreground">
            Deficiency resolved in software model · Ready for EVC physical verification
          </p>
        </div>
        <span className="rounded-md bg-emerald-400/15 border border-emerald-400/30 px-2 py-1 text-[9px] font-semibold text-emerald-300 light:text-emerald-700 shrink-0">
          CURED
        </span>
      </div>
    </div>
  );
}

// ==========================================
// STAGE 5: INSPECT PREVIEW
// ==========================================
function StageInspectPreview() {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-violet-500/20 text-violet-300 light:text-violet-700">
              <Landmark className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Expert Visit Committee (EVC)
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Inspection ID: EVC-2026-SW-014 · On-site physical verification
          </p>
        </div>
        <Badge variant="violet" dot>
          Inspection Completed
        </Badge>
      </div>

      {/* Committee Members */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Assigned Expert Committee
        </p>
        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { name: "Dr. R. K. Sharma", role: "Chairman · NIT" },
            { name: "Prof. M. V. Iyer", role: "Subject Expert · CSE" },
            { name: "Sh. A. K. Patel", role: "AICTE Regional Officer" },
          ].map((m, idx) => (
            <div key={idx} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="text-[11px] font-medium text-foreground truncate">{m.name}</p>
              <p className="text-[9px] text-muted-foreground truncate">{m.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* On-Site Verification Checklist */}
      <div className="space-y-1.5">
        {[
          { item: "Block C Instructional Area Re-measurement", val: "2,280 m² verified", ok: true },
          { item: "Faculty Biometric Attendance & Credentials", val: "41 / 42 verified", ok: true },
          { item: "High-Performance Computing Center & LAN", val: "Compliant", ok: true },
          { item: "Barrier-Free Access, Ramps & Fire Systems", val: "Compliant", ok: true },
        ].map((chk, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-medium text-foreground truncate">{chk.item}</span>
            </div>
            <span className="font-mono text-[9px] text-emerald-300 light:text-emerald-700 font-semibold shrink-0">
              {chk.val}
            </span>
          </div>
        ))}
      </div>

      {/* Committee Sign-off */}
      <div className="flex items-center justify-between rounded-xl border border-violet-400/25 bg-violet-500/[0.06] p-2.5 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-300 light:text-violet-700 shrink-0" />
          <span className="text-[10px] text-violet-200 light:text-violet-700">
            Unanimous recommendation for approval filed within 48h SLA window.
          </span>
        </div>
        <span className="font-mono text-[9px] text-violet-300 light:text-violet-700 font-semibold shrink-0">
          3/3 SIGNED
        </span>
      </div>
    </div>
  );
}

// ==========================================
// STAGE 6: DECIDE PREVIEW
// ==========================================
function StageDecidePreview() {
  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-emerald-300 light:text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              Regulatory Approval & Decision
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Order Reference: AICTE/SW/2026-27/1-9482910 · Extension of Approval
          </p>
        </div>
        <Badge variant="success" dot>
          APPROVED
        </Badge>
      </div>

      {/* Official Approval Grant Summary */}
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-emerald-200 light:text-emerald-700">Extension of Approval (EoA) Granted</span>
          <span className="font-mono text-emerald-300 light:text-emerald-700 font-semibold">Valid 2026-2029</span>
        </div>
        <p className="mt-1 text-[10px] text-emerald-200/80 leading-relaxed">
          AICTE Executive Council certifies Sundar Institute of Technology satisfies all statutory requirements under Approval Process Handbook 2026-27.
        </p>
      </div>

      {/* Immutable Audit Ledger Trail */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Immutable Audit Log Records
        </p>
        {[
          { step: "01. Application Wizard Submitted", time: "12 Apr, 09:20", hash: "0x19a4...2f8d" },
          { step: "02. Handbook Rule Engine Run (1 Gap)", time: "14 Apr, 11:05", hash: "0x38b1...e45c" },
          { step: "03. Scrutiny SCN Issued & Cured", time: "20 Apr, 10:14", hash: "0x71fa...889b" },
          { step: "04. EVC Inspection Signed (3/3)", time: "24 Apr, 16:40", hash: "0x90c3...d31a" },
          { step: "05. Executive Approval Sealed", time: "26 Apr, 14:00", hash: "0x8f2c...e14d" },
        ].map((log, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px]"
          >
            <div className="flex items-center gap-2 truncate">
              <Lock className="h-3 w-3 text-violet-200 light:text-violet-700 shrink-0" />
              <span className="font-medium text-foreground truncate">{log.step}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground shrink-0">
              <span>{log.time}</span>
              <span className="text-violet-200/80">{log.hash}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Official CTA / Audit Link */}
      <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-emerald-400" />
          <span className="text-[11px] font-medium text-foreground">
            Digitally Signed EoA Letter Generated
          </span>
        </div>
        <span className="font-mono text-[9px] text-emerald-300 light:text-emerald-700">CRYPTOGRAPHICALLY SEALED</span>
      </div>
    </div>
  );
}
