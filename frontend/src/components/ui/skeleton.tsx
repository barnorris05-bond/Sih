import * as React from "react";
import { cn } from "@/lib/utils";

/** Neutral placeholder block. The pulse is disabled for users who prefer reduced motion. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-xl bg-white/[0.06] motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
