"use client";

import { useCallback, useRef } from "react";
import type { PlatformEvent } from "@aicte/shared";
import { useLiveEvents } from "@/hooks/use-live-events";
import { useToast } from "@/components/providers/toast-provider";

export function LiveEventBridge({ enabled }: { enabled: boolean }) {
  const { toast } = useToast();
  const seen = useRef<Set<string>>(new Set());

  const handleEvent = useCallback(
    (event: PlatformEvent) => {
      if (seen.current.has(event.id)) return;
      seen.current.add(event.id);
      if (seen.current.size > 200) seen.current = new Set();

      if (event.type === "SLA_BREACHED") {
        toast({
          title: "SLA breach auto-escalated",
          description: event.message,
          variant: "error",
        });
      } else if (event.type === "APPLICATION_APPROVED") {
        toast({
          title: "Institution approved",
          description: event.message,
          variant: "success",
        });
      } else if (event.type === "DEFICIENCY_RAISED") {
        toast({
          title: "Deficiency notice issued",
          description: event.message,
          variant: "warning",
        });
      }
    },
    [toast],
  );

  useLiveEvents(handleEvent, { enabled });

  return null;
}
