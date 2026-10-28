"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlaCountdownProps {
  deadline: string | null;
  className?: string;
  compact?: boolean;
  label?: string;
}

interface Remaining {
  ms: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diff(deadline: string): Remaining {
  const ms = new Date(deadline).getTime() - Date.now();
  const abs = Math.abs(ms);
  return {
    ms,
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
  };
}

export function SlaCountdown({ deadline, className, compact = false, label }: SlaCountdownProps) {
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!deadline) return;
    const tick = () => setRemaining(diff(deadline));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (!deadline) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {label ? `${label}: ` : ""}No active SLA
      </span>
    );
  }

  if (!mounted || !remaining) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <Clock3 className="h-3.5 w-3.5" />
        <span className="tabular-nums">--:--:--</span>
      </span>
    );
  }

  const overdue = remaining.ms <= 0;
  const urgent = !overdue && remaining.ms < 24 * 60 * 60 * 1000;

  const text = overdue
    ? compact
      ? `${remaining.days > 0 ? `${remaining.days}d ` : ""}${remaining.hours}h overdue`
      : `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m overdue`
    : remaining.days > 0
      ? `${remaining.days}d ${String(remaining.hours).padStart(2, "0")}h ${compact ? "" : `${String(remaining.minutes).padStart(2, "0")}m`}`
      : `${String(remaining.hours).padStart(2, "0")}h ${String(remaining.minutes).padStart(2, "0")}m ${compact ? "" : `${String(remaining.seconds).padStart(2, "0")}s`}`;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums",
          overdue
            ? "border-rose-400/40 bg-rose-500/10 text-rose-300 light:text-rose-700"
            : urgent
              ? "border-amber-400/40 bg-amber-400/10 text-amber-300 light:text-amber-700"
              : "border-white/10 bg-white/[0.04] text-muted-foreground",
          className,
        )}
      >
        {overdue ? <AlertOctagon className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
        {text}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        overdue
          ? "border-rose-400/40 bg-rose-500/[0.07]"
          : urgent
            ? "border-amber-400/30 bg-amber-400/[0.06]"
            : "border-white/10 bg-white/[0.03]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label ?? "SLA window"}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
            overdue
              ? "bg-rose-500/20 text-rose-300 light:text-rose-700 animate-pulse"
              : urgent
                ? "bg-amber-400/20 text-amber-300 light:text-amber-700"
                : "bg-emerald-400/15 text-emerald-300 light:text-emerald-700",
          )}
        >
          {overdue ? "SLA exceeded" : urgent ? "At risk" : "On track"}
        </span>
      </div>
      <div
        className={cn(
          "mt-1.5 flex items-center gap-1.5 font-display text-lg font-semibold tabular-nums",
          overdue ? "text-rose-300 light:text-rose-700" : urgent ? "text-amber-200 light:text-amber-700" : "text-foreground",
        )}
      >
        {overdue ? <AlertOctagon className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
        {text}
      </div>
    </div>
  );
}
