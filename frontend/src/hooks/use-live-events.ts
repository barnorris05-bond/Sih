"use client";

import { useEffect, useRef } from "react";
import type { PlatformEvent } from "@aicte/shared";

interface LiveOptions {
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Subscribes to `/api/events` (Server-Sent Events). The browser reconnects
 * automatically; the handler ref keeps the stream stable across renders.
 */
export function useLiveEvents(
  onEvent: (event: PlatformEvent) => void,
  { enabled = true, onConnectionChange }: LiveOptions = {},
): void {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const connectionRef = useRef(onConnectionChange);
  connectionRef.current = onConnectionChange;

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("EventSource" in window)) return;

    const source = new EventSource("/api/events");

    source.onopen = () => connectionRef.current?.(true);
    source.onerror = () => connectionRef.current?.(false);
    source.onmessage = (message) => {
      try {
        const parsed = JSON.parse(message.data) as PlatformEvent | { type: "ping" };
        if ("id" in parsed && parsed.type !== ("ping" as PlatformEvent["type"])) {
          handlerRef.current(parsed);
        }
      } catch {
        // Ignore malformed frames; the stream will continue.
      }
    };

    return () => {
      source.close();
      connectionRef.current?.(false);
    };
  }, [enabled]);
}
