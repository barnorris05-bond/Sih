"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { toastVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  { icon: React.ReactNode; className: string }
> = {
  info: { icon: <Info className="h-4 w-4" />, className: "border-sky-400/30 text-sky-200 light:text-sky-700" },
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    className: "border-emerald-400/30 text-emerald-200 light:text-emerald-700",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    className: "border-amber-400/30 text-amber-200 light:text-amber-700",
  },
  error: { icon: <XCircle className="h-4 w-4" />, className: "border-rose-400/30 text-rose-200 light:text-rose-700" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((current) => [...current.slice(-3), { ...input, id }]);
      const duration = input.durationMs ?? 5200;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((entry) => {
            const variant = entry.variant ?? "info";
            const meta = VARIANT_META[variant];
            return (
              <motion.div
                key={entry.id}
                layout
                variants={toastVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={cn(
                  "pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#0d1422]/95 p-3.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl light:bg-white/95",
                  meta.className,
                )}
              >
                <span className="mt-0.5 shrink-0">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">{entry.title}</p>
                  {entry.description ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(entry.id)}
                  className="rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Dismiss notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
