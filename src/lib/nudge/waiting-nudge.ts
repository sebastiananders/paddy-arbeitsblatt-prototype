"use client";

import { useSyncExternalStore } from "react";

/**
 * The "Schluck Wasser" line: one invitation per session while a worksheet is written.
 *
 * Rules (prototype test, see Notion spec):
 * - worksheet runs only, never for plain chat thinking
 * - appears 6 s into the run, if the estimate leaves at least 10 s
 * - once per session (page load / demo reset)
 * - stays until the run is done; gives way to the slow state, failures and cancel
 */
export const NUDGE_AFTER_MS = 6_000;
export const NUDGE_MIN_REMAINING_MS = 10_000;

let owner: string | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const waitingNudge = {
  /** Claims the once-per-session nudge for a run. Returns true if this run owns it. */
  claim(runId: string) {
    if (owner === null) {
      owner = runId;
      notify();
    }
    return owner === runId;
  },
  reset() {
    owner = null;
    notify();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useNudgeOwner() {
  return useSyncExternalStore(
    waitingNudge.subscribe,
    () => owner,
    () => null,
  );
}

/** 0:14, 1:05 */
export const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
