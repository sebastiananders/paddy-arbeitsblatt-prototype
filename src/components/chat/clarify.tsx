"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { ClarifyInput, ClarifyOutput } from "@/lib/chat/types";
import { Chip } from "@/components/paddy/primitives";
import { useWorkspace } from "@/components/workspace-context";

/** Client-side tool: renders the question and answers it via addToolOutput. */
export function Clarify({
  toolCallId,
  input,
  output,
}: {
  toolCallId: string;
  input?: ClarifyInput;
  output?: ClarifyOutput;
}) {
  const { answerClarification, status } = useWorkspace();
  const [free, setFree] = useState("");
  if (!input) return null;

  if (output) {
    return (
      <p className="body-xs inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-brand">
        <Check className="size-3.5" aria-hidden />
        {output.skipped ? `Standard übernommen: ${output.answer}` : output.answer}
      </p>
    );
  }

  const busy = status === "streaming" || status === "submitted";
  return (
    <div className="animate-fade-in rounded-lg border border-decorative-2 bg-container p-4">
      <p className="body-s">{input.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {input.options.map((o) => (
          <Chip key={o} disabled={busy} onClick={() => answerClarification(toolCallId, o, false)}>
            {o}
          </Chip>
        ))}
      </div>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (free.trim()) answerClarification(toolCallId, free.trim(), false);
        }}
      >
        <input
          value={free}
          onChange={(e) => setFree(e.target.value)}
          placeholder="Oder selbst eingeben, z. B. »Klasse 6, Förderschule«"
          className="body-xs h-8 flex-1 rounded-sm border border-decorative-2 bg-container px-3 outline-none placeholder:text-secondary focus:border-brand"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => answerClarification(toolCallId, input.defaultValue, true)}
          className="body-xs inline-flex items-center gap-1 text-secondary hover:text-brand"
        >
          {input.skipLabel}
          <ArrowRight className="size-3.5" aria-hidden />
        </button>
      </form>
    </div>
  );
}
