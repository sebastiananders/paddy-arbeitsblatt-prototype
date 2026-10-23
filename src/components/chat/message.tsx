"use client";

import { BookOpen, RotateCcw } from "lucide-react";
import type { PaddyMessage } from "@/lib/chat/types";
import { BotAvatar, Button, Chip } from "@/components/paddy/primitives";
import { useWorkspace } from "@/components/workspace-context";
import { WorksheetRun } from "./worksheet-run";
import { Clarify } from "./clarify";
import { Rating } from "./rating";

export function Message({
  message,
  isLast,
}: {
  message: PaddyMessage;
  isLast: boolean;
}) {
  const { status, send } = useWorkspace();
  const streaming =
    isLast && (status === "streaming" || status === "submitted");

  if (message.role === "user") {
    const text = message.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    return (
      <div className="flex justify-end">
        <p className="body-s max-w-[85%] rounded-lg rounded-br-sm bg-brand-light px-4 py-2.5 text-primary">
          {text}
        </p>
      </div>
    );
  }

  const hasResult = message.parts.some(
    (p) =>
      p.type === "tool-createWorksheet" &&
      p.state === "output-available" &&
      !p.preliminary &&
      p.output.status === "ready",
  );
  const sources = message.parts.filter((p) => p.type === "source-document");
  const showActions = isLast && !streaming;

  return (
    <div className="flex gap-3">
      <div className="pt-0.5">
        <BotAvatar size={32} pulsing={streaming} />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return part.text ? (
                <p key={i} className="body-s whitespace-pre-wrap text-primary">
                  {part.text}
                </p>
              ) : null;

            case "tool-createWorksheet":
              return (
                <div key={part.toolCallId} className="space-y-2">
                  <WorksheetRun
                  runId={part.toolCallId}
                    input={
                      part.state === "input-streaming" ? undefined : part.input
                    }
                    output={
                      part.state === "output-available"
                        ? part.output
                        : undefined
                    }
                    final={
                      part.state === "output-available" && !part.preliminary
                    }
                    live={streaming}
                  />
                  {sources.length > 0 && (
                    <p className="body-xs flex items-center gap-1.5 px-1 text-secondary">
                      <BookOpen className="size-3.5" aria-hidden />
                      Quelle:{" "}
                      {sources
                        .map((s) =>
                          s.type === "source-document" ? s.title : "",
                        )
                        .join(", ")}
                    </p>
                  )}
                </div>
              );

            case "tool-askClarification":
              return (
                <Clarify
                  key={part.toolCallId}
                  toolCallId={part.toolCallId}
                  input={
                    part.state === "input-streaming" ? undefined : part.input
                  }
                  output={
                    part.state === "output-available" ? part.output : undefined
                  }
                />
              );

            case "data-suggestions":
              return showActions ? (
                <div key={i} className="space-y-2 pt-1">
                  <p className="body-xs text-secondary">Weiter anpassen</p>
                  <div className="flex flex-wrap gap-2">
                    {part.data.items.map((c) => (
                      <Chip key={c.label} onClick={() => send(c.prompt)}>
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null;

            case "data-recovery":
              return showActions ? (
                <Button
                  key={i}
                  size="sm"
                  variant="secondary"
                  icon={<RotateCcw className="size-3.5" />}
                  onClick={() => send(part.data.prompt)}
                >
                  {part.data.label}
                </Button>
              ) : null;

            default:
              return null;
          }
        })}

        {hasResult && !streaming && <Rating />}
      </div>
    </div>
  );
}
