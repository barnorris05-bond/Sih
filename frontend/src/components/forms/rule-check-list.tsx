"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { RuleCheck } from "@aicte/shared";
import { SEVERITY_STYLES } from "@/lib/format";
import { cn } from "@/lib/utils";

export function RuleCheckList({
  checks,
  compact = false,
  showRemediation = false,
  className,
}: {
  checks: RuleCheck[];
  compact?: boolean;
  showRemediation?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {checks.map((check, index) => (
        <motion.div
          key={check.code}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, type: "spring", stiffness: 180, damping: 22 }}
          className={cn(
            "rounded-xl border p-3 transition-colors",
            check.passed
              ? "border-emerald-400/15 bg-emerald-400/[0.035]"
              : "border-rose-400/25 bg-rose-500/[0.045]",
          )}
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0">
              {check.passed ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : check.severity === "CRITICAL" ? (
                <AlertTriangle className="h-4 w-4 animate-pulse text-rose-400" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <p className="text-xs font-medium text-foreground">{check.title}</p>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider",
                    SEVERITY_STYLES[check.severity].className,
                  )}
                >
                  {check.severity}
                </span>
              </div>
              {!compact ? (
                <div className="mt-1.5 grid gap-1 text-[10px] sm:grid-cols-2">
                  <p className="text-muted-foreground">
                    <span className="text-muted-foreground/60">Required </span>
                    {check.requiredValue}
                  </p>
                  <p className={check.passed ? "text-emerald-300/90" : "text-rose-300/90"}>
                    <span className="text-muted-foreground/60">Declared </span>
                    {check.actualValue}
                  </p>
                </div>
              ) : null}
              {!check.passed && showRemediation ? (
                <p className="mt-1.5 rounded-lg bg-white/[0.03] px-2 py-1 text-[10px] leading-relaxed text-muted-foreground">
                  {check.remediation}
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
