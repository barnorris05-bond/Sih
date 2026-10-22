import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { PlatformEvent } from "@aicte/shared";
import { pushEvent } from "../store/database";

const globalForBus = globalThis as unknown as { __aicteBus?: EventEmitter };

function bus(): EventEmitter {
  if (!globalForBus.__aicteBus) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(200);
    globalForBus.__aicteBus = emitter;
  }
  return globalForBus.__aicteBus;
}

export interface NewEventInput {
  type: PlatformEvent["type"];
  title: string;
  message: string;
  applicationId?: string | null;
  severity?: PlatformEvent["severity"];
}

export function createEvent(input: NewEventInput): PlatformEvent {
  return {
    id: randomUUID(),
    type: input.type,
    title: input.title,
    message: input.message,
    applicationId: input.applicationId ?? null,
    severity: input.severity ?? "INFO",
    timestamp: new Date().toISOString(),
  };
}

/** Persists the event and fans it out to every connected dashboard stream. */
export function publishEvent(event: PlatformEvent): PlatformEvent {
  pushEvent(event);
  bus().emit("platform-event", event);
  return event;
}

export function emitEvent(input: NewEventInput): PlatformEvent {
  return publishEvent(createEvent(input));
}

export function subscribeToEvents(listener: (event: PlatformEvent) => void): () => void {
  const emitter = bus();
  emitter.on("platform-event", listener);
  return () => emitter.off("platform-event", listener);
}
