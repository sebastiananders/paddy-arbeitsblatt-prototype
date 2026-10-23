"use client";

import { useSyncExternalStore } from "react";

/**
 * Demo controls for the walkthrough. Not part of the product.
 * Failure toggles are one-shot: they reset after firing, so "Erneut versuchen" succeeds.
 */
export type DemoSettings = {
  /** 0.5 = slower, 2 = faster. */
  speed: number;
  /**
   * When the canvas opens on its own (CPO decision #1).
   * done = once the worksheet is ready · live = as soon as writing starts · manual = only on click
   */
  canvasOpen: "done" | "live" | "manual";
  failCreate: boolean;
  failExport: boolean;
  failRevise: boolean;
  slow: boolean;
};

const defaults: DemoSettings = {
  speed: 1,
  canvasOpen: "done",
  failCreate: false,
  failExport: false,
  failRevise: false,
  slow: false,
};

let state: DemoSettings = { ...defaults };
const listeners = new Set<() => void>();

export const demoSettings = {
  get: () => state,
  set: (patch: Partial<DemoSettings>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  reset: () => demoSettings.set(defaults),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useDemoSettings() {
  return useSyncExternalStore(demoSettings.subscribe, demoSettings.get, () => defaults);
}
