"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useChat } from "@ai-sdk/react";
import { BookOpen, FolderOpen, MessageCircle, Sparkles, Users } from "lucide-react";
import { ScriptedTransport } from "@/lib/chat/scripted-transport";
import { activeRun, readyVersions } from "@/lib/chat/derive";
import type { PaddyMessage } from "@/lib/chat/types";
import { demoSettings } from "@/lib/demo/settings";
import { waitingNudge } from "@/lib/nudge/waiting-nudge";
import { BotAvatar, Chip } from "@/components/paddy/primitives";
import { Composer, type ComposerHandle } from "@/components/chat/composer";
import { Message } from "@/components/chat/message";
import { Canvas } from "@/components/canvas/canvas";
import { DemoPanel } from "@/components/demo/demo-panel";
import { WorkspaceContext, type CanvasState, type Workspace as WorkspaceValue } from "./workspace-context";

/** Continue automatically only after the teacher answered a clarifying question. */
function answeredClarification({ messages }: { messages: PaddyMessage[] }) {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return false;
  const lastTool = [...last.parts].reverse().find((p) => p.type.startsWith("tool-"));
  return lastTool?.type === "tool-askClarification" && lastTool.state === "output-available";
}

export function Workspace() {
  const transport = useMemo(() => new ScriptedTransport(), []);
  const { messages, sendMessage, status, stop, setMessages, addToolOutput } = useChat<PaddyMessage>({
    transport,
    sendAutomaticallyWhen: answeredClarification,
  });

  const [canvas, setCanvas] = useState<CanvasState>({ open: false, version: null, fullscreen: false });
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const streaming = status === "streaming" || status === "submitted";

  // Canvas follows the work. By default it opens once a version is ready, so the chat
  // carries progress alone and the document arrives as the result (demo setting =
  // CPO decision #1). If it is already open, it follows the version being built and
  // switches to newer versions when they are ready. Adjusted during render, not in an effect.
  const active = activeRun(messages, streaming);
  const activeKey = active?.toolCallId;
  const latestReady = readyVersions(messages).at(-1);
  const [seen, setSeen] = useState<{ active?: string; latest?: number }>({});
  if (activeKey !== seen.active || latestReady !== seen.latest) {
    setSeen({ active: activeKey, latest: latestReady });
    let next = canvas;
    if (active && activeKey !== seen.active) {
      const target = active.input.targetVersion;
      if (active.input.request === "create" && !next.open && demoSettings.get().canvasOpen === "live") {
        next = { ...next, open: true, version: target };
      } else if (next.open) {
        next = { ...next, version: target };
      }
    }
    if (latestReady !== undefined && latestReady !== seen.latest) {
      if (next.open) next = { ...next, version: latestReady };
      else if (demoSettings.get().canvasOpen === "done") next = { ...next, open: true, version: latestReady };
    }
    if (next !== canvas) setCanvas(next);
  }

  // Keep the newest content in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback((text: string) => sendMessage({ text }), [sendMessage]);
  const reset = useCallback(() => {
    stop();
    waitingNudge.reset();
    setMessages([]);
    setCanvas({ open: false, version: null, fullscreen: false });
  }, [stop, setMessages]);

  const value: WorkspaceValue = {
    messages,
    status,
    canvas,
    openCanvas: (version) => setCanvas((c) => ({ ...c, open: true, version })),
    closeCanvas: () => setCanvas((c) => ({ ...c, open: false, fullscreen: false })),
    setFullscreen: (fullscreen) => setCanvas((c) => ({ ...c, fullscreen })),
    prefill: (text) => composer.current?.prefill(text),
    send,
    stop,
    answerClarification: (toolCallId, answer, skipped) =>
      addToolOutput({ tool: "askClarification", toolCallId, output: { answer, skipped } }),
  };

  const empty = messages.length === 0;

  return (
    <WorkspaceContext.Provider value={value}>
      <div className="flex h-dvh overflow-hidden">
        <AppRail />

        <main
          className={clsx(
            "flex min-w-0 flex-col transition-[width] duration-300",
            canvas.open ? (canvas.fullscreen ? "hidden" : "w-[42%] min-w-[380px]") : "flex-1",
          )}
        >
          <div ref={scroller} className="flex-1 overflow-y-auto">
            <div className={clsx("mx-auto w-full max-w-[760px] px-6", empty ? "flex h-full flex-col justify-center" : "space-y-6 py-8")}>
              {empty ? (
                <div className="space-y-6 pb-10">
                  <div className="flex items-center gap-4">
                    <BotAvatar size={45} />
                    <h1 className="heading-m">Hi Anna, wie kann ich helfen?</h1>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <Message key={m.id} message={m} isLast={i === messages.length - 1} />)
              )}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[760px] px-6 pb-4">
            {empty && (
              <div className="mb-3 flex flex-wrap gap-2">
                <Chip onClick={() => send("Erstelle ein Arbeitsblatt zur Fotosynthese für Klasse 7")}>
                  Arbeitsblatt zur Fotosynthese für Klasse 7
                </Chip>
                <Chip onClick={() => send("Mach mir ein Arbeitsblatt zur Fotosynthese")}>Arbeitsblatt zur Fotosynthese</Chip>
              </div>
            )}
            <Composer ref={composer} busy={streaming} onSend={send} onStop={stop} />
          </div>
        </main>

        {canvas.open && (
          <div className={clsx("min-w-0 border-l border-decorative-2", canvas.fullscreen ? "flex-1" : "flex-1")}>
            <Canvas />
          </div>
        )}
      </div>
      <DemoPanel onReset={reset} onPrompt={send} />
    </WorkspaceContext.Provider>
  );
}

/** Minimal paddy navigation, for context only. */
function AppRail() {
  const items = [
    { icon: MessageCircle, label: "Magic Chat", active: true },
    { icon: FolderOpen, label: "Materialien" },
    { icon: Users, label: "Gruppen" },
    { icon: Sparkles, label: "Agenten" },
    { icon: BookOpen, label: "Lehrpläne" },
  ];
  return (
    <nav aria-label="paddy" className="flex w-[68px] shrink-0 flex-col items-center gap-2 border-r border-decorative-2 bg-container py-4">
      <span className="mb-3 text-[15px] font-semibold tracking-tight text-brand">paddy</span>
      {items.map(({ icon: Icon, label, active }) => (
        <span
          key={label}
          title={label}
          className={clsx(
            "flex size-10 items-center justify-center rounded-sm",
            active ? "bg-brand-light text-brand" : "text-secondary",
          )}
        >
          <Icon className="size-5" aria-hidden />
          <span className="sr-only">{label}</span>
        </span>
      ))}
    </nav>
  );
}
