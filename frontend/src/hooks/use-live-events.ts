"use client";

import { useEffect, useRef } from "react";
import type { PlatformEvent } from "@aicte/shared";

interface LiveOptions {
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

interface Subscriber {
  onEvent: (event: PlatformEvent) => void;
  onConnection: (connected: boolean) => void;
}

/**
 * One `EventSource` per browser tab, shared by every subscriber. The app mounts several consumers at
 * once (the global toast bridge plus per-page activity feeds); opening a stream for each wasted a
 * server connection and one of the browser's six HTTP/1.1 connections per origin for every extra copy.
 */
const shared: {
  source: EventSource | null;
  connected: boolean;
  subscribers: Set<Subscriber>;
  closeTimer: ReturnType<typeof setTimeout> | null;
} = { source: null, connected: false, subscribers: new Set(), closeTimer: null };

/** Keep the stream briefly after the last subscriber leaves so route changes don't reconnect. */
const CLOSE_GRACE_MS = 2_000;

function setConnected(connected: boolean): void {
  shared.connected = connected;
  shared.subscribers.forEach((subscriber) => subscriber.onConnection(connected));
}

function openStream(): void {
  if (shared.source) return;
  const source = new EventSource("/api/events");
  shared.source = source;

  source.onopen = () => setConnected(true);
  source.onerror = () => setConnected(false);
  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data) as PlatformEvent | { type: "ping" };
      if ("id" in parsed && parsed.type !== ("ping" as PlatformEvent["type"])) {
        shared.subscribers.forEach((subscriber) => subscriber.onEvent(parsed));
      }
    } catch {
      // Ignore malformed frames; the stream will continue.
    }
  };
}

function closeStream(): void {
  shared.source?.close();
  shared.source = null;
  shared.connected = false;
}

/**
 * Subscribes to `/api/events` (Server-Sent Events). The browser reconnects automatically; the handler
 * ref keeps the subscription stable across renders.
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

    const subscriber: Subscriber = {
      onEvent: (event) => handlerRef.current(event),
      onConnection: (connected) => connectionRef.current?.(connected),
    };
    shared.subscribers.add(subscriber);
    if (shared.closeTimer) {
      clearTimeout(shared.closeTimer);
      shared.closeTimer = null;
    }
    openStream();
    // A late joiner learns the current state immediately instead of waiting for the next transition.
    if (shared.connected) subscriber.onConnection(true);

    return () => {
      shared.subscribers.delete(subscriber);
      connectionRef.current?.(false);
      if (shared.subscribers.size === 0 && !shared.closeTimer) {
        shared.closeTimer = setTimeout(() => {
          shared.closeTimer = null;
          if (shared.subscribers.size === 0) closeStream();
        }, CLOSE_GRACE_MS);
      }
    };
  }, [enabled]);
}
