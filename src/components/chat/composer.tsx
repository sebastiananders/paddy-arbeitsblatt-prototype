"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Mic, Plus, Square } from "lucide-react";
import { Button } from "@/components/paddy/primitives";

export type ComposerHandle = { prefill: (text: string) => void };

/** Figma: botInputField (empty / typing / filled / pending). */
export const Composer = forwardRef<ComposerHandle, { busy: boolean; onSend: (t: string) => void; onStop: () => void }>(
  function Composer({ busy, onSend, onStop }, ref) {
    const [value, setValue] = useState("");
    const area = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      prefill(text) {
        setValue(text);
        requestAnimationFrame(() => {
          const el = area.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(text.length, text.length);
        });
      },
    }));

    const submit = () => {
      const t = value.trim();
      if (!t || busy) return;
      onSend(t);
      setValue("");
    };

    return (
      <div className="w-full">
        <div className="rounded-lg bg-container p-4 shadow-large">
          <textarea
            ref={area}
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Chatte mit Paddy..."
            aria-label="Nachricht an paddy"
            className="body-s block min-h-[45px] w-full resize-none bg-transparent outline-none placeholder:text-secondary"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Datei hinzufügen" className="rounded-sm p-2 text-primary hover:bg-brand-light">
                <Plus className="size-5" aria-hidden />
              </button>
              <button type="button" aria-label="Spracheingabe" className="rounded-sm p-2 text-primary hover:bg-brand-light">
                <Mic className="size-5" aria-hidden />
              </button>
            </div>
            {busy ? (
              <Button variant="secondary" onClick={onStop} icon={<Square className="size-3 fill-current" />} className="min-w-[105px]">
                Stopp
              </Button>
            ) : (
              <Button onClick={submit} disabled={!value.trim()} className="min-w-[105px]">
                Senden
              </Button>
            )}
          </div>
        </div>
        <p className="body-xs mt-2 text-center text-secondary">KI macht Fehler. Wichtige Infos bitte prüfen.</p>
      </div>
    );
  },
);
