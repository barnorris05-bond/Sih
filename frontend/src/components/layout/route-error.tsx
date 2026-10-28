"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Recoverable failure state for a route segment: explains what happened and offers a retry. */
export function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-16 sm:px-6">
      <Card role="alert">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-400/25 bg-amber-400/10">
            <AlertTriangle className="h-6 w-6 text-amber-300" />
          </span>
          <p className="font-display text-base font-semibold text-foreground">This page could not be loaded</p>
          <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
            Something went wrong while preparing this view. Your data has not been changed. Try again, or return to
            the home page.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </Button>
            <Link href="/">
              <Button size="sm" variant="secondary">
                Go to home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
