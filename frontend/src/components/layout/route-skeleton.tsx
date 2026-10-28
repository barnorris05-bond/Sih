import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant feedback while a server-rendered workspace route streams in. Mirrors the PageShell header
 * and a card grid so the real content replaces it without shifting the layout.
 */
export function RouteSkeleton({ label, columns = 3 }: { label: string; columns?: 2 | 3 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-[1440px] px-4 pb-10 pt-8 sm:px-6 lg:px-8"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-2.5 w-36" />
      <Skeleton className="mt-3 h-8 w-72 max-w-full" />
      <Skeleton className="mt-3 h-3 w-full max-w-2xl" />
      <div className={`mt-8 grid gap-3 ${columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-[26rem]" />
        <Skeleton className="h-[26rem]" />
      </div>
    </div>
  );
}
