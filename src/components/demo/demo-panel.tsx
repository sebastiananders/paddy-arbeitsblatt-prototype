"use client";

import { useState } from "react";
import clsx from "clsx";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { demoSettings, useDemoSettings, type DemoSettings } from "@/lib/demo/settings";

/** Walkthrough controls. Clearly separate from the product UI. */
export function DemoPanel({ onReset, onPrompt }: { onReset: () => void; onPrompt: (text: string) => void }) {
  const s = useDemoSettings();
  const [open, setOpen] = useState(false);

  const toggle = (key: keyof DemoSettings, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-2.5 py-1.5">
      <input
        type="checkbox"
        checked={Boolean(s[key])}
        onChange={(e) => demoSettings.set({ [key]: e.target.checked })}
        className="mt-0.5 size-4 accent-[#2f2d39]"
      />
      <span>
        <span className="block text-[13px] text-white">{label}</span>
        <span className="block text-[11px] text-white/55">{hint}</span>
      </span>
    </label>
  );

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans">
      {open ? (
        <div className="w-[300px] rounded-lg bg-[#1f1e27] p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <FlaskConical className="size-4" aria-hidden /> Demo-Steuerung
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="text-white/60 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          <p className="mb-1 text-[11px] tracking-wide text-white/50 uppercase">Szenario starten</p>
          <div className="mb-3 space-y-1.5">
            {[
              ["Happy Path", "Erstelle ein Arbeitsblatt zur Fotosynthese für Klasse 7"],
              ["Dünner Prompt → Rückfrage", "Mach mir ein Arbeitsblatt zur Fotosynthese"],
            ].map(([label, prompt]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onReset();
                  setTimeout(() => onPrompt(prompt), 50);
                }}
                className="block w-full rounded-sm bg-white/8 px-3 py-2 text-left text-[13px] hover:bg-white/15"
              >
                {label}
                <span className="block truncate text-[11px] text-white/50">»{prompt}«</span>
              </button>
            ))}
          </div>

          <p className="mb-1 text-[11px] tracking-wide text-white/50 uppercase">Beim nächsten Lauf</p>
          {toggle("failCreate", "Erstellung schlägt fehl", "bei Aufgabe 3")}
          {toggle("failExport", "Word-Export schlägt fehl", "Inhalt fertig, Datei fehlt")}
          {toggle("failRevise", "v2 schlägt fehl", "bei »Kürzer«")}
          {toggle("slow", "Langsamer Schritt", "zeigt »Dauert länger als üblich«")}

          <p className="mt-3 mb-1 text-[11px] tracking-wide text-white/50 uppercase">Verhalten</p>
          <p className="mt-1 text-[13px] text-white">Vorschau öffnet sich</p>
          <p className="mb-1.5 text-[11px] text-white/55">CPO-Entscheidung #1</p>
          <div className="flex gap-1 text-[12px]">
            {(
              [
                ["done", "wenn fertig"],
                ["live", "sofort (live)"],
                ["manual", "nur per Klick"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => demoSettings.set({ canvasOpen: v })}
                className={clsx(
                  "flex-1 rounded-sm px-2 py-1",
                  s.canvasOpen === v ? "bg-white text-[#1f1e27]" : "bg-white/8 hover:bg-white/15",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 text-[13px]">
            <span className="text-white/70">Tempo</span>
            {[0.5, 1, 2].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => demoSettings.set({ speed: v })}
                className={clsx("rounded-sm px-2 py-0.5", s.speed === v ? "bg-white text-[#1f1e27]" : "bg-white/8 hover:bg-white/15")}
              >
                {v}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-sm border border-white/20 py-2 text-[13px] hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Chat zurücksetzen
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#1f1e27] px-3.5 py-2 text-[12px] font-medium text-white shadow-lg hover:bg-black"
        >
          <FlaskConical className="size-3.5" aria-hidden /> Demo
        </button>
      )}
    </div>
  );
}
