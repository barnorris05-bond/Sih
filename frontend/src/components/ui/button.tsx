"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-indigo-500 via-indigo-500 to-sky-500 text-white shadow-[0_10px_40px_-16px_rgba(99,102,241,0.9)] hover:shadow-[0_16px_50px_-14px_rgba(56,189,248,0.7)] hover:brightness-110",
        secondary:
          "glass text-foreground hover:border-indigo-400/40 hover:bg-white/[0.08]",
        outline:
          "border border-border bg-transparent text-foreground hover:border-indigo-400/50 hover:bg-indigo-500/10",
        ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        danger:
          "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-[0_10px_36px_-16px_rgba(244,63,94,0.9)] hover:brightness-110",
        success:
          "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_10px_36px_-16px_rgba(16,185,129,0.9)] hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
