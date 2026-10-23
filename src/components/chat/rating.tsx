"use client";

import { useState } from "react";
import clsx from "clsx";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Chip } from "@/components/paddy/primitives";

const REASONS = ["zu lang", "falsches Niveau", "fachlich falsch", "Layout"];

/** Product feedback on a result. Corrections go through refinement, not here. */
export function Rating() {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);
  const [sent, setSent] = useState(false);

  const btn = (v: "up" | "down", Icon: typeof ThumbsUp, label: string) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={vote === v}
      onClick={() => {
        setVote(v);
        setSent(v === "up");
      }}
      className={clsx(
        "rounded-sm p-1.5 transition-colors hover:bg-brand-light",
        vote === v ? "text-brand" : "text-secondary",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {btn("up", ThumbsUp, "Hilfreich")}
        {btn("down", ThumbsDown, "Nicht hilfreich")}
        {sent && <span className="body-xs ml-1 text-secondary">Danke für dein Feedback.</span>}
      </div>
      {vote === "down" && !sent && (
        <div className="animate-fade-in rounded-lg border border-decorative-2 bg-container p-3">
          <p className="body-xs text-secondary">Was hat nicht gepasst? (optional)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <Chip
                key={r}
                tone={reasons.includes(r) ? "selected" : "default"}
                onClick={() => setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]))}
              >
                {r}
              </Chip>
            ))}
            <button type="button" onClick={() => setSent(true)} className="body-xs ml-1 font-semibold text-brand hover:underline">
              Senden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
