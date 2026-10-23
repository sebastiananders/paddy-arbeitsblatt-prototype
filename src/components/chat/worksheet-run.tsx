"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertCircle, Check, ChevronDown, Clock, Download, Eye, FileText, Loader2, Maximize2, RotateCcw } from "lucide-react";
import { worksheetFor } from "@/fixtures";
import { readyVersions } from "@/lib/chat/derive";
import type { Step, WorksheetToolInput, WorksheetToolOutput } from "@/lib/chat/types";
import { Button } from "@/components/paddy/primitives";
import { ScaledPage, worksheetPages } from "@/components/canvas/worksheet-paper";
import { useWorkspace } from "@/components/workspace-context";
import { useDemoSettings } from "@/lib/demo/settings";
import {
  NUDGE_AFTER_MS,
  NUDGE_MIN_REMAINING_MS,
  formatElapsed,
  useNudgeOwner,
  waitingNudge,
} from "@/lib/nudge/waiting-nudge";

type Props = {
  runId: string;
  input?: WorksheetToolInput;
  output?: WorksheetToolOutput;
  final: boolean;
  /** This run belongs to the message that is currently streaming. */
  live: boolean;
};

/** Time since this run appeared. Stops (and freezes) when the run stops running. */
function useElapsed(running: boolean) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [running]);
  return now - start;
}

export function WorksheetRun({ runId, input, output, final, live }: Props) {
  const { stop, canvas, openCanvas } = useWorkspace();
  const demo = useDemoSettings();
  const [expanded, setExpanded] = useState(false);

  const status = output?.status ?? "working";
  const running = live && status === "working";
  const elapsed = useElapsed(running);

  // Waiting nudge: claim the once-per-session slot at 6 s if the estimate leaves enough time.
  const nudgeOwner = useNudgeOwner();
  const estimate = output?.estimateMs;
  const eligible =
    running && !output?.slow && estimate !== undefined && elapsed >= NUDGE_AFTER_MS && estimate - elapsed >= NUDGE_MIN_REMAINING_MS;
  useEffect(() => {
    if (eligible) waitingNudge.claim(runId);
  }, [eligible, runId]);
  const showNudge = running && !output?.slow && nudgeOwner === runId;
  // Production rule: show working time after 10 s (or together with the nudge).
  const showElapsed = running && (elapsed >= 10_000 || showNudge);

  if (!input) return <IntentLine pending />;

  const aborted = !final && !live;
  // Opt-in live view. Waits until the nudge is decided (6 s) so the two never flicker.
  const canWatchLive =
    running &&
    input.request === "create" &&
    (output?.blocksReady ?? 0) > 0 &&
    !(canvas.open && canvas.version === input.targetVersion);
  const done = status === "ready";
  const collapsed = done && !expanded;
  const steps = output?.steps ?? [];

  return (
    <div className="animate-fade-in space-y-3">
      <div className="rounded-lg border border-decorative-2 bg-container px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <IntentLine input={input} />
          {showElapsed && (
            <span className="body-xs shrink-0 pt-0.5 text-secondary tabular-nums" aria-label="Bisherige Dauer">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="body-xs mt-2 inline-flex items-center gap-1 text-secondary hover:text-primary"
          >
            <Check className="size-3.5 text-success" aria-hidden />
            {steps.length} Schritte erledigt
            {elapsed >= 1000 && <span className="tabular-nums">· Fertig nach {formatElapsed(elapsed)}</span>}
            <ChevronDown className="size-3.5" aria-hidden />
          </button>
        ) : (
          <ol className="mt-3 space-y-2" aria-live="polite">
            {steps.map((s) => (
              <StepRow key={s.id} step={s} aborted={aborted} />
            ))}
          </ol>
        )}

        {showNudge && (
          <div className="animate-fade-in mt-3 border-t border-decorative-2 pt-3" aria-live="polite">
            <p className="body-s text-primary">Zeit für einen Schluck Wasser 💧</p>
            {demo.canvasOpen === "done" && !canvas.open && (
              <p className="body-xs text-secondary">
                Das Arbeitsblatt öffnet sich von selbst, sobald es fertig ist.{" "}
                {canWatchLive && (
                  <button type="button" onClick={() => openCanvas(input.targetVersion)} className="text-brand hover:underline">
                    Oder live zusehen
                  </button>
                )}
              </p>
            )}
          </div>
        )}

        {/* Opt-in: watch the document being written. Off the main path to keep noise down. */}
        {canWatchLive && !showNudge && elapsed >= NUDGE_AFTER_MS && (
            <button
              type="button"
              onClick={() => openCanvas(input.targetVersion)}
              className="body-xs mt-3 inline-flex items-center gap-1.5 text-brand hover:underline"
            >
              <Eye className="size-3.5" aria-hidden />
              Live ansehen
            </button>
          )}

        {output?.slow && live && (
          <div className="body-xs mt-3 flex items-center justify-between gap-3 rounded-sm bg-warning-light px-3 py-2 text-warning">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden />
              Dauert länger als üblich.
            </span>
            <button type="button" onClick={stop} className="font-semibold underline-offset-2 hover:underline">
              Abbrechen
            </button>
          </div>
        )}

        {aborted && (
          <p className="body-xs mt-3 text-secondary">Abgebrochen. Es wurde nichts gespeichert.</p>
        )}

        {status === "failed" && output?.failureMessage && (
          <p className="body-xs mt-3 flex items-start gap-1.5 rounded-sm bg-error-light px-3 py-2 text-error">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {output.failureMessage}
          </p>
        )}
      </div>

      {done && output?.result && <ResultCard input={input} result={output.result} />}
      {status === "export-failed" && <ExportFailedCard input={input} message={output?.failureMessage} />}
    </div>
  );
}

function IntentLine({ input, pending }: { input?: WorksheetToolInput; pending?: boolean }) {
  if (pending || !input) {
    return (
      <p className="body-s flex items-center gap-2 text-secondary">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Anfrage wird verstanden …
      </p>
    );
  }
  const facets =
    input.request === "revise"
      ? // What paddy understood stays visible here, not as a fake step.
        [...(input.change ? [input.change] : []), `v${input.targetVersion - 1} → v${input.targetVersion}`]
      : [input.subject, input.grade, input.topic];
  return (
    <p className="body-s flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="inline-flex items-center gap-1.5 rounded-sm bg-brand-light px-2 py-0.5 text-brand">
        <FileText className="size-3.5" aria-hidden />
        {input.request === "revise" ? "Arbeitsblatt überarbeiten" : "Arbeitsblatt"}
      </span>
      {facets.map((f) => (
        <span key={f} className="text-secondary">
          · {f}
        </span>
      ))}
    </p>
  );
}

function StepRow({ step, aborted }: { step: Step; aborted: boolean }) {
  const running = step.status === "running" && !aborted;
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center">
        {step.status === "done" && <Check className="size-4 text-success" aria-label="erledigt" />}
        {running && <Loader2 className="size-4 animate-spin text-brand" aria-label="läuft" />}
        {step.status === "failed" && <AlertCircle className="size-4 text-error" aria-label="fehlgeschlagen" />}
        {(step.status === "pending" || (step.status === "running" && aborted)) && (
          <span className="size-2 rounded-full border border-secondary/50" aria-label="offen" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={clsx(
            "body-s block",
            step.status === "pending" && "text-secondary",
            step.status === "failed" && "text-error",
          )}
        >
          {step.status === "done" ? (step.doneLabel ?? step.label) : step.label}
        </span>
        {running && step.detail && <span className="body-xs block text-secondary">{step.detail}</span>}
        {step.status === "failed" && step.error && <span className="body-xs block text-error/80">{step.error}</span>}
      </span>
    </li>
  );
}

function ResultCard({ input, result }: { input: WorksheetToolInput; result: NonNullable<WorksheetToolOutput["result"]> }) {
  const { messages, openCanvas, canvas } = useWorkspace();
  const latest = Math.max(...readyVersions(messages));
  const outdated = result.version < latest;
  const ws = worksheetFor(result.version, input.grade);
  const isOpen = canvas.open && canvas.version === result.version;

  return (
    <div
      className={clsx(
        "flex gap-4 rounded-lg border bg-container p-3 shadow-large transition-opacity",
        isOpen ? "border-brand/50" : "border-decorative-2",
        outdated && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={() => openCanvas(result.version)}
        className="shrink-0 overflow-hidden rounded-sm border border-decorative-2 bg-white transition-shadow hover:shadow-large focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={`${result.title}, Version ${result.version} öffnen`}
      >
        <ScaledPage width={104}>{worksheetPages({ ws, firstPageOnly: true })}</ScaledPage>
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="body-s line-clamp-2">{result.title}</p>
          <span
            className={clsx(
              "body-xs shrink-0 rounded-full px-2 py-0.5",
              outdated ? "bg-decorative-2 text-secondary" : "bg-brand-light text-brand",
            )}
          >
            v{result.version}
            {outdated && " · ältere Version"}
          </span>
        </div>
        <p className="body-xs mt-1 text-secondary">
          {result.pages - 1} Seiten + Lösungsblatt · {result.tasks} Aufgaben · Word
        </p>

        {result.changes && (
          <div className="body-xs mt-2 rounded-sm bg-success-light px-3 py-2 text-primary">
            <p className="font-semibold text-success">{result.changes.headline}</p>
            <ul className="mt-1 space-y-0.5">
              {result.changes.changed.map((c) => (
                <li key={c}>– {c}</li>
              ))}
            </ul>
            <p className="mt-1 text-secondary">{result.changes.unchanged}</p>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Button size="sm" variant="secondary" icon={<Maximize2 className="size-3.5" />} onClick={() => openCanvas(result.version)}>
            Öffnen
          </Button>
          <a
            href={result.downloadUrl}
            download
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-brand px-3 text-xs font-medium text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Download className="size-3.5" aria-hidden />
            Herunterladen
          </a>
        </div>
      </div>
    </div>
  );
}

function ExportFailedCard({ input, message }: { input: WorksheetToolInput; message?: string }) {
  const { openCanvas, send, status } = useWorkspace();
  const ws = worksheetFor(input.targetVersion, input.grade);
  return (
    <div className="flex gap-4 rounded-lg border border-error/30 bg-container p-3">
      <button
        type="button"
        onClick={() => openCanvas(input.targetVersion)}
        className="shrink-0 overflow-hidden rounded-sm border border-decorative-2 bg-white"
        aria-label="Vorschau öffnen"
      >
        <ScaledPage width={104}>{worksheetPages({ ws, firstPageOnly: true })}</ScaledPage>
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="body-s">{ws.title}</p>
        <p className="body-xs mt-1 flex items-start gap-1.5 text-error">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {message}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Button size="sm" variant="secondary" onClick={() => openCanvas(input.targetVersion)}>
            Vorschau ansehen
          </Button>
          <Button
            size="sm"
            icon={<RotateCcw className="size-3.5" />}
            disabled={status !== "ready"}
            onClick={() => send("Word-Datei erneut erzeugen")}
          >
            Word-Datei erneut erzeugen
          </Button>
        </div>
      </div>
    </div>
  );
}
