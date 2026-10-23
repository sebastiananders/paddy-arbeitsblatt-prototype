import type { PaddyMessage, WorksheetToolInput, WorksheetToolOutput } from "./types";

export type WorksheetRun = {
  toolCallId: string;
  messageId: string;
  input: WorksheetToolInput;
  output?: WorksheetToolOutput;
  /** False while preliminary outputs are still streaming. */
  final: boolean;
};

/** All worksheet tool runs in the conversation, in order. */
export function worksheetRuns(messages: PaddyMessage[]): WorksheetRun[] {
  const runs: WorksheetRun[] = [];
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type !== "tool-createWorksheet") continue;
      if (p.state === "output-available") {
        runs.push({ toolCallId: p.toolCallId, messageId: m.id, input: p.input, output: p.output, final: !p.preliminary });
      } else if (p.state === "input-available" || p.state === "input-streaming") {
        if (p.input) runs.push({ toolCallId: p.toolCallId, messageId: m.id, input: p.input as WorksheetToolInput, final: false });
      }
    }
  }
  return runs;
}

/** Versions that exist and can be downloaded, oldest first. */
export function readyVersions(messages: PaddyMessage[]): number[] {
  const set = new Set<number>();
  for (const r of worksheetRuns(messages)) {
    if (r.output?.status === "ready" && r.output.result) set.add(r.output.result.version);
  }
  return [...set].sort((a, b) => a - b);
}

/** The run currently producing content (only while the chat is streaming). */
export function activeRun(messages: PaddyMessage[], streaming: boolean): WorksheetRun | undefined {
  if (!streaming) return undefined;
  const last = worksheetRuns(messages).at(-1);
  return last && !last.final ? last : undefined;
}

/** Content exists but the Word file failed: preview is allowed, download is not. */
export function exportFailedVersions(messages: PaddyMessage[]): number[] {
  const ready = new Set(readyVersions(messages));
  return [
    ...new Set(
      worksheetRuns(messages)
        .filter((r) => r.output?.status === "export-failed" && !ready.has(r.input.targetVersion))
        .map((r) => r.input.targetVersion),
    ),
  ];
}

export function gradeFor(messages: PaddyMessage[], version: number): string | undefined {
  return worksheetRuns(messages).find((r) => r.input.targetVersion === version)?.input.grade;
}
