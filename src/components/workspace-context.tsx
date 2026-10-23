"use client";

import { createContext, useContext } from "react";
import type { ChatStatus } from "ai";
import type { PaddyMessage } from "@/lib/chat/types";

export type CanvasState = { open: boolean; version: number | null; fullscreen: boolean };

export type Workspace = {
  messages: PaddyMessage[];
  status: ChatStatus;
  canvas: CanvasState;
  openCanvas: (version: number) => void;
  closeCanvas: () => void;
  setFullscreen: (v: boolean) => void;
  /** Puts text into the composer without sending. */
  prefill: (text: string) => void;
  /** Sends as the teacher (chips, recovery). */
  send: (text: string) => void;
  stop: () => void;
  answerClarification: (toolCallId: string, answer: string, skipped: boolean) => void;
};

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace outside provider");
  return ctx;
}
