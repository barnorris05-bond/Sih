import type { ReactNode } from "react";
import { FadeIn } from "@/components/animations/fade-in";
import { cn } from "@/lib/utils";

interface PageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8", className)}>
      <FadeIn className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-violet-300/80">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </FadeIn>
      <div className="mt-6">{children}</div>
    </div>
  );
}
