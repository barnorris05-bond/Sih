"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertOctagon,
  CheckCircle2,
  CircleDot,
  FileWarning,
  Radio,
  Send,
} from "lucide-react";
import type { PlatformEvent } from "@aicte/shared";
import { useLiveEvents } from "@/hooks/use-live-events";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ICONS: Record<PlatformEvent["type"], React.ReactNode> = {
  STATE_CHANGED: <CircleDot className="h-3.5 w-3.5" />,
  DEFICIENCY_RAISED: <FileWarning className="h-3.5 w-3.5" />,
  SLA_WARNING: <AlertOctagon className="h-3.5 w-3.5" />,
  SLA_BREACHED: <AlertOctagon className="h-3.5 w-3.5" />,
  APPLICATION_SUBMITTED: <Send className="h-3.5 w-3.5" />,
  APPLICATION_APPROVED: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const TONES: Record<PlatformEvent["severity"], string> = {
  INFO: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300",
  SUCCESS: "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-300",
  WARNING: "border-amber-400/25 bg-amber-400/[0.07] text-amber-300",
  CRITICAL: "border-rose-400/30 bg-rose-500/[0.08] text-rose-300",
};

export function ActivityFeed({
  initialEvents,
  limit = 14,
  className,
}: {
  initialEvents: PlatformEvent[];
  limit?: number;
  className?: string;
}) {
  const [events, setEvents] = useState<PlatformEvent[]>(initialEvents);
  const [connected, setConnected] = useState(false);

  const handleEvent = useCallback((event: PlatformEvent) => {
    setEvents((current) => {
      if (current.some((entry) => entry.id === event.id)) return current;
      return [event, ...current].slice(0, 60);
    });
  }, []);

  useLiveEvents(handleEvent, { onConnectionChange: setConnected });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full",
                connected ? "animate-ping bg-emerald-400 opacity-75" : "bg-rose-400",
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 rounded-full",
                connected ? "bg-emerald-400" : "bg-rose-400",
              )}
            />
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {connected ? "Live audit stream" : "Reconnecting…"}
          </span>
        </div>
        <Radio className={cn("h-3 w-3", connected ? "text-emerald-400" : "text-rose-400")} />
      </div>

      <div className="scrollbar-none mt-2 max-h-[336px] space-y-1.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {events.slice(0, limit).map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="flex items-start gap-2.5 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-white/[0.06] hover:bg-white/[0.025]"
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border",
                  TONES[event.severity],
                )}
              >
                {ICONS[event.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[11px] font-medium text-foreground">{event.title}</p>
                  <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/70">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                  {event.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
