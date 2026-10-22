"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CountUp } from "@/components/animations/count-up";
import { SCORE_COLORS, scoreTone } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ComplianceGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
  showRules?: { passed: number; total: number };
}

export function ComplianceGauge({
  score,
  size = 188,
  strokeWidth = 12,
  label = "Compliance index",
  sublabel,
  className,
  showRules,
}: ComplianceGaugeProps) {
  const gradientId = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeScore / 100) * circumference;
  const tone = scoreTone(safeScore);
  const color = SCORE_COLORS[tone];

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${safeScore}%`}>
        <defs>
          <linearGradient id={`gauge-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="55%" stopColor={color} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={safeScore >= 65 ? 1 : 0.35} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.14)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gauge-${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 60, damping: 15, mass: 0.9 }
          }
        />
      </svg>

      <div className="absolute inset-0 grid place-content-center text-center">
        <div className="flex items-baseline justify-center gap-0.5">
          <CountUp
            value={safeScore}
            className="font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground"
          />
          <span className="text-sm font-medium text-muted-foreground">%</span>
        </div>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        {showRules ? (
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            {showRules.passed}/{showRules.total} rules cleared
          </p>
        ) : sublabel ? (
          <p className="mt-1 text-[10px] text-muted-foreground/80">{sublabel}</p>
        ) : null}
      </div>
    </div>
  );
}
