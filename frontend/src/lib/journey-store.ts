import { useSyncExternalStore } from "react";

/**
 * Tiny external store that publishes the *discrete* parts of the approval
 * journey (active stage, whether the horizontal journey has taken over) so
 * the site header and the journey UI can react to the same source of truth.
 * Continuous values (scroll progress, interpolation) stay inside the
 * journey's animation loop and never go through React.
 */
export interface JourneyState {
  stage: number;
  inJourney: boolean;
}

const initial: JourneyState = { stage: 0, inJourney: false };
let state = initial;
const listeners = new Set<() => void>();

export const journeyStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  set(patch: Partial<JourneyState>) {
    const next = { ...state, ...patch };
    if (next.stage === state.stage && next.inJourney === state.inJourney) return;
    state = next;
    listeners.forEach((listener) => listener());
  },
  /** Registered by the journey component; scrolls the page to a stage. */
  goToStage: null as ((index: number) => void) | null,
};

export function useJourney(): JourneyState {
  return useSyncExternalStore(journeyStore.subscribe, journeyStore.get, () => initial);
}
