"use client";

import { motion } from "framer-motion";
import {
  Check,
  ClipboardCheck,
  FileWarning,
  Landmark,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import type { ApplicationState } from "@aicte/shared";
import { cn } from "@/lib/utils";

interface TimelineStep {
  key: ApplicationState;
  label: string;
  icon: typeof Send;
}

const BASE_STEPS: TimelineStep[] = [
  { key: "DRAFT", label: "Draft", icon: Send },
  { key: "SUBMITTED", label: "Submitted", icon: ShieldCheck },
  { key: "UNDER_SCRUTINY", label: "Scrutiny", icon: ClipboardCheck },
  { key: "EVC_INSPECTION", label: "EVC visit", icon: Landmark },
  { key: "APPROVED", label: "Decision", icon: Check },
];

export function WorkflowTimeline({ state }: { state: ApplicationState }) {
  const hasDeficiency =
    state === "DEFICIENCY_NOTIFIED" || state === "RULE_VALIDATION_FAILED";

  const steps: TimelineStep[] = [...BASE_STEPS];
  if (hasDeficiency) {
    steps.splice(3, 0, {
      key: "DEFICIENCY_NOTIFIED",
      label: "Deficiency",
      icon: FileWarning,
    });
  }

  const stateIndex = steps.findIndex((step) => step.key === state);
  const currentIndex =
    state === "REJECTED" ? steps.length - 1 : stateIndex >= 0 ? stateIndex : 0;
  const rejected = state === "REJECTED";
  const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <div className="relative">
      <div className="absolute left-[18px] right-[18px] top-[17px] h-px bg-white/[0.08]" />
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `calc(${progress}% - ${progress > 0 ? 0 : 0}px)` }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
        className={cn(
          "absolute left-[18px] top-[17px] h-px max-w-[calc(100%-36px)]",
          rejected
            ? "bg-gradient-to-r from-violet-500 via-rose-400 to-rose-500"
            : "bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400",
        )}
      />
      <div className="relative flex justify-between gap-1">
        {steps.map((step, index) => {
          const complete = index < currentIndex;
          const current = index === currentIndex;
          const isRejected = rejected && index === currentIndex;
          const Icon = step.icon;
          return (
            <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <motion.span
                initial={false}
                animate={{
                  scale: current ? 1.08 : 1,
                  borderColor: complete
                    ? "rgba(52,211,153,0.5)"
                    : current
                      ? "rgba(129,140,248,0.7)"
                      : "rgba(148,163,184,0.18)",
                }}
                className={cn(
                  "relative z-10 grid h-9 w-9 place-items-center rounded-full border bg-[#0b1120] transition-colors",
                  complete
                    ? "text-emerald-300 light:text-emerald-700"
                    : current
                      ? "text-violet-100 light:text-violet-700"
                      : "text-muted-foreground/60",
                  isRejected && "border-rose-400/70 text-rose-300 light:text-rose-700",
                )}
              >
                {complete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isRejected ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {current && !isRejected ? (
                  <span className="absolute inset-0 animate-ping rounded-full border border-violet-400/30" />
                ) : null}
              </motion.span>
              <span
                className={cn(
                  "truncate text-center text-[9px] font-medium uppercase tracking-[0.1em]",
                  complete
                    ? "text-emerald-300/80"
                    : current
                      ? isRejected
                        ? "text-rose-300 light:text-rose-700"
                        : "text-violet-100 light:text-violet-700"
                      : "text-muted-foreground/60",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
