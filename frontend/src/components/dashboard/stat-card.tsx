"use client";

import { motion } from "framer-motion";
import {
  AlertOctagon,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  FileWarning,
  Gauge,
  Landmark,
  Layers,
  ShieldCheck,
  TimerReset,
  TrendingUp,
} from "lucide-react";
import { CountUp } from "@/components/animations/count-up";
import { cn } from "@/lib/utils";

const CARD_ICONS = {
  shield: ShieldCheck,
  warning: FileWarning,
  layers: Layers,
  landmark: Landmark,
  trending: TrendingUp,
  alert: AlertOctagon,
  clock: Clock3,
  timer: TimerReset,
  gauge: Gauge,
} as const;

export type StatIcon = keyof typeof CARD_ICONS;

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: StatIcon;
  hint?: string;
  trend?: { value: number; direction: "up" | "down"; positive?: boolean };
  accent?: "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";
  className?: string;
  delay?: number;
}

const ACCENTS: Record<
  NonNullable<StatCardProps["accent"]>,
  { icon: string; glow: string; bar: string }
> = {
  indigo: {
    icon: "text-indigo-300 border-indigo-400/25 bg-indigo-500/10",
    glow: "from-indigo-500/20",
    bar: "bg-indigo-400",
  },
  emerald: {
    icon: "text-emerald-300 border-emerald-400/25 bg-emerald-500/10",
    glow: "from-emerald-500/20",
    bar: "bg-emerald-400",
  },
  amber: {
    icon: "text-amber-300 border-amber-400/25 bg-amber-500/10",
    glow: "from-amber-500/20",
    bar: "bg-amber-400",
  },
  rose: {
    icon: "text-rose-300 border-rose-400/25 bg-rose-500/10",
    glow: "from-rose-500/20",
    bar: "bg-rose-400",
  },
  sky: {
    icon: "text-sky-300 border-sky-400/25 bg-sky-500/10",
    glow: "from-sky-500/20",
    bar: "bg-sky-400",
  },
  violet: {
    icon: "text-violet-300 border-violet-400/25 bg-violet-500/10",
    glow: "from-violet-500/20",
    bar: "bg-violet-400",
  },
};

export function StatCard({
  label,
  value,
  suffix,
  prefix,
  decimals = 0,
  icon,
  hint,
  trend,
  accent = "indigo",
  className,
  delay = 0,
}: StatCardProps) {
  const tone = ACCENTS[accent];
  const Icon = CARD_ICONS[icon];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 90, damping: 18, delay }}
      whileHover={{ y: -3 }}
      className={cn(
        "glass group relative overflow-hidden rounded-2xl p-4",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100",
          tone.glow,
          "opacity-60",
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <CountUp
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              className="font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground"
            />
          </div>
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl border", tone.icon)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-3 flex items-center justify-between gap-2">
        <p className="truncate text-[10px] text-muted-foreground">{hint ?? "\u00A0"}</p>
        {trend ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 text-[10px] font-medium",
              trend.positive === false ? "text-rose-300" : "text-emerald-300",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {trend.value}%
          </span>
        ) : null}
      </div>
      <div className="relative mt-3 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(12, value % 100 || 42))}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.2 }}
          className={cn("h-full rounded-full opacity-70", tone.bar)}
        />
      </div>
    </motion.div>
  );
}
