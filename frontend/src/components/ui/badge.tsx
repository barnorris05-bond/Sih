import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 tracking-wide transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-white/15 bg-white/[0.07] text-muted-foreground",
        info: "border-sky-400/40 bg-sky-400/15 text-sky-200 light:border-sky-300 light:bg-sky-500/10 light:text-sky-700",
        indigo: "border-violet-400/40 bg-violet-400/15 text-violet-200 light:border-violet-300 light:bg-violet-500/10 light:text-violet-700",
        success: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200 light:border-emerald-300 light:bg-emerald-500/10 light:text-emerald-700",
        warning: "border-amber-400/40 bg-amber-400/15 text-amber-200 light:border-amber-300 light:bg-amber-500/10 light:text-amber-700",
        danger: "border-rose-400/50 bg-rose-500/15 text-rose-200 light:border-rose-300 light:bg-rose-500/10 light:text-rose-700",
        violet: "border-fuchsia-400/40 bg-fuchsia-400/15 text-fuchsia-200 light:border-fuchsia-300 light:bg-fuchsia-500/10 light:text-fuchsia-700",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export { badgeVariants };
