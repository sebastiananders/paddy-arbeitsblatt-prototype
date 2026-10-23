"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { BookOpen, Download, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { worksheetFor } from "@/fixtures";
import { activeRun, exportFailedVersions, gradeFor, readyVersions, worksheetRuns } from "@/lib/chat/derive";
import { useWorkspace } from "@/components/workspace-context";
import { PAGE_W, ScaledPage, useElementWidth, worksheetPages } from "./worksheet-paper";

export function Canvas() {
  const { messages, status, canvas, openCanvas, closeCanvas, setFullscreen } = useWorkspace();
  const [showSources, setShowSources] = useState(false);
  const [bodyRef, bodyWidth] = useElementWidth<HTMLDivElement>();

  const streaming = status === "streaming" || status === "submitted";
  const ready = readyVersions(messages);
  const exportFailed = exportFailedVersions(messages);
  const active = activeRun(messages, streaming);
  const requested = canvas.version ?? ready.at(-1) ?? 1;

  // Only show what exists: a ready version, one whose Word export failed (content is there),
  // or the one being built right now. A failed or cancelled run never shows half-written content;
  // we fall back to the latest version that exists, or to an empty state.
  const exists = (v: number) =>
    ready.includes(v) || exportFailed.includes(v) || active?.input.targetVersion === v;
  const version = exists(requested) ? requested : ready.at(-1);
  const lastRun = worksheetRuns(messages).filter((r) => r.input.targetVersion === requested).at(-1);
  const missingReason =
    lastRun?.output?.status === "failed"
      ? (lastRun.output.failureMessage ?? "Das Arbeitsblatt konnte nicht erstellt werden.")
      : "Abgebrochen. Es wurde nichts gespeichert.";

  const building = active && active.input.targetVersion === version ? active : undefined;
  const revising = building?.input.request === "revise";
  const blocksReady = building && !revising ? (building.output?.blocksReady ?? 0) : undefined;

  // Follow the writing: keep the block being written in view.
  useEffect(() => {
    if (blocksReady === undefined) return;
    bodyRef.current?.querySelector("[data-writing]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [blocksReady, bodyRef]);

  if (version === undefined) {
    return (
      <section aria-label="Arbeitsblatt-Vorschau" className="flex h-full min-w-0 flex-col bg-container">
        <header className="flex items-center justify-end border-b border-decorative-2 px-4 py-3">
          <button
            type="button"
            onClick={closeCanvas}
            aria-label="Vorschau schließen"
            className="rounded-sm p-2 text-secondary hover:bg-brand-light hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#ececf3] px-8 text-center">
          <p className="body-s text-primary">Kein Arbeitsblatt vorhanden</p>
          <p className="body-xs max-w-[320px] text-secondary">{missingReason}</p>
        </div>
      </section>
    );
  }
  const fellBack = version !== requested;

  // While revising, keep showing the previous version until the new one exists.
  const shownVersion = revising ? version - 1 : version;
  const ws = worksheetFor(shownVersion, gradeFor(messages, version) ?? gradeFor(messages, 1));

  const canDownload = ready.includes(version);
  const versions = [...new Set([...ready, ...exportFailed, ...(active ? [active.input.targetVersion] : [])])].sort();
  const pageWidth = Math.max(240, Math.min(PAGE_W, bodyWidth - 48));

  return (
    <section aria-label="Arbeitsblatt-Vorschau" className="flex h-full min-w-0 flex-col bg-container">
      <header className="flex items-center gap-3 border-b border-decorative-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="body-s truncate">{ws.title}</p>
          <p className="body-xs text-secondary">
            {building && !revising ? (
              <span className="inline-flex items-center gap-1 text-brand">
                <Loader2 className="size-3 animate-spin" aria-hidden /> Wird geschrieben …
              </span>
            ) : (
              `${ws.subject} · ${ws.grade} · Word`
            )}
          </p>
        </div>

        {versions.length > 0 && (
          <div role="tablist" aria-label="Version" className="flex rounded-sm bg-canvas p-0.5">
            {versions.map((v) => {
              const isBuilding = active?.input.targetVersion === v && !ready.includes(v);
              return (
                <button
                  key={v}
                  role="tab"
                  aria-selected={v === version}
                  onClick={() => openCanvas(v)}
                  className={clsx(
                    "body-xs rounded-[6px] px-2.5 py-1 transition-colors",
                    v === version ? "bg-container text-primary shadow-sm" : "text-secondary hover:text-primary",
                  )}
                >
                  v{v}
                  {isBuilding && " · entsteht"}
                </button>
              );
            })}
          </div>
        )}

        {ws.sources.length > 0 && !building && (
          <button
            type="button"
            onClick={() => setShowSources((s) => !s)}
            aria-expanded={showSources}
            className="body-xs inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-secondary hover:bg-brand-light hover:text-primary"
          >
            <BookOpen className="size-3.5" aria-hidden />
            Quellen ({ws.sources.length})
          </button>
        )}

        {canDownload ? (
          <a
            href={`/api/worksheet/${version}?grade=${encodeURIComponent(ws.grade)}`}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3 text-xs font-medium text-on-brand hover:bg-brand-hover"
          >
            <Download className="size-3.5" aria-hidden /> Herunterladen (.docx)
          </a>
        ) : (
          <span
            className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 rounded-sm bg-brand/40 px-3 text-xs font-medium text-on-brand"
            title={exportFailed.includes(version) ? "Die Word-Datei fehlt noch" : "Verfügbar, sobald das Dokument fertig ist"}
          >
            <Download className="size-3.5" aria-hidden /> Herunterladen (.docx)
          </span>
        )}

        <button
          type="button"
          onClick={() => setFullscreen(!canvas.fullscreen)}
          aria-label={canvas.fullscreen ? "Vollbild verlassen" : "Vollbild"}
          className="rounded-sm p-2 text-secondary hover:bg-brand-light hover:text-primary"
        >
          {canvas.fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
        <button
          type="button"
          onClick={closeCanvas}
          aria-label="Vorschau schließen"
          className="rounded-sm p-2 text-secondary hover:bg-brand-light hover:text-primary"
        >
          <X className="size-4" />
        </button>
      </header>

      {showSources && !building && (
        <div className="border-b border-decorative-2 bg-container-2 px-4 py-3">
          <p className="body-xs mb-1 text-secondary">Verwendet für dieses Arbeitsblatt</p>
          {ws.sources.map((s) => (
            <p key={s.title} className="body-xs">
              <span className="text-primary">{s.title}</span> <span className="text-secondary">· {s.detail}</span>
            </p>
          ))}
        </div>
      )}

      {fellBack && (
        <p className="body-xs bg-error-light px-4 py-2 text-error">
          {missingReason} Du siehst v{version}.
        </p>
      )}
      {revising && (
        <p className="body-xs flex items-center gap-2 bg-brand-light px-4 py-2 text-brand">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          v{version} wird erstellt. Bis dahin siehst du v{version - 1}.
        </p>
      )}
      {exportFailed.includes(version) && !canDownload && (
        <p className="body-xs bg-error-light px-4 py-2 text-error">Vorschau ist fertig, die Word-Datei fehlt noch.</p>
      )}

      <div ref={bodyRef} className="flex-1 overflow-y-auto bg-[#ececf3] py-6">
        {bodyWidth > 0 && (
          <div className="flex flex-col items-center gap-5">
            {worksheetPages({ ws, blocksReady }).map((page, i) => (
              <ScaledPage key={i} width={pageWidth} className={clsx("shadow-paper", revising && "opacity-70")}>
                {page}
              </ScaledPage>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
