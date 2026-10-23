import type { UIMessage } from "ai";

/**
 * Message contract between Magic Chat (client) and the harness (server).
 * In the prototype a scripted transport produces these; in production the real
 * endpoint would stream the same parts, so the UI does not change.
 */

export type StepStatus = "pending" | "running" | "done" | "failed";

export type Step = {
  id: string;
  label: string;
  /** Past-tense label once done, e.g. "Lehrplan durchsucht". */
  doneLabel?: string;
  /** Live line under a running step, e.g. "Aufgabe 3 von 5". */
  detail?: string;
  status: StepStatus;
  /** Plain-language reason, only when failed. */
  error?: string;
};

export type WorksheetRequest = "create" | "revise" | "export";

export type WorksheetToolInput = {
  request: WorksheetRequest;
  topic: string;
  subject: string;
  grade: string;
  /** For revise: what the teacher asked to change. */
  change?: string;
  /** Version this run builds (1 for create, 2 for the first revision …). */
  targetVersion: number;
};

export type WorksheetChanges = {
  headline: string;
  changed: string[];
  unchanged: string;
};

export type WorksheetResult = {
  version: number;
  title: string;
  pages: number;
  tasks: number;
  answerKey: boolean;
  durationMin: number;
  downloadUrl: string;
  changes?: WorksheetChanges;
};

/**
 * Streamed as preliminary tool outputs while running, then once more as final output.
 * A step only becomes "done" when its artifact exists; `result` only appears when
 * the Word file can actually be downloaded.
 */
export type WorksheetToolOutput = {
  status: "working" | "ready" | "failed" | "export-failed";
  steps: Step[];
  /** How many blocks of the target version exist yet. Drives the live canvas. */
  blocksReady: number;
  /** Set by the server when a step runs longer than usual. */
  slow?: boolean;
  /**
   * Rough total duration of this run in ms, from history per tool and request type.
   * Never shown as a number or promise; only decides whether a waiting line fits.
   */
  estimateMs?: number;
  result?: WorksheetResult;
  /** Shown when status is failed / export-failed. */
  failureMessage?: string;
};

export type ClarifyInput = {
  question: string;
  options: string[];
  skipLabel: string;
  /** Used when the teacher skips; named in the follow-up so the default is never silent. */
  defaultValue: string;
};

export type ClarifyOutput = { answer: string; skipped: boolean };

export type PaddyTools = {
  createWorksheet: { input: WorksheetToolInput; output: WorksheetToolOutput };
  askClarification: { input: ClarifyInput; output: ClarifyOutput };
};

export type Chip = { label: string; prompt: string };

export type PaddyData = {
  /** Refinement chips under a result. */
  suggestions: { items: Chip[] };
  /** Recovery action after a failure. */
  recovery: Chip;
};

export type PaddyMessage = UIMessage<never, PaddyData, PaddyTools>;
