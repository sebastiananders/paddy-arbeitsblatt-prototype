import type { ChatTransport, UIMessageChunk } from "ai";
import { demoSettings } from "@/lib/demo/settings";
import { worksheetFor, v2Changes } from "@/fixtures";
import { pageCount, taskCount } from "@/lib/worksheet/types";
import type {
  Chip,
  ClarifyInput,
  ClarifyOutput,
  PaddyMessage,
  Step,
  WorksheetToolInput,
  WorksheetToolOutput,
} from "./types";

/**
 * Scripted stand-in for the harness endpoint.
 * It reads the conversation, decides what Magic Chat would do, and streams real
 * AI SDK UI message chunks with realistic timing. Swap this for DefaultChatTransport
 * pointed at the real API and the UI keeps working unchanged.
 */
export class ScriptedTransport implements ChatTransport<PaddyMessage> {
  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<PaddyMessage>["sendMessages"]>[0]) {
    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        const w = writer(controller, abortSignal);
        try {
          await route(messages, w);
          controller.close();
        } catch (err) {
          if (abortSignal?.aborted) {
            try {
              controller.close();
            } catch {
              /* already closed by the consumer */
            }
            return;
          }
          controller.error(err);
        }
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stream helpers

type Writer = {
  write: (chunk: UIMessageChunk) => void;
  wait: (ms: number) => Promise<void>;
  text: (text: string) => Promise<void>;
};

function writer(
  controller: ReadableStreamDefaultController<UIMessageChunk>,
  signal: AbortSignal | undefined,
): Writer {
  const wait = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("aborted", "AbortError"));
      const t = setTimeout(resolve, ms / demoSettings.get().speed);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("aborted", "AbortError"));
        },
        { once: true },
      );
    });

  const write = (chunk: UIMessageChunk) => controller.enqueue(chunk);

  /** Streams text word by word, like a model would. */
  const text = async (value: string) => {
    const id = `txt-${crypto.randomUUID()}`;
    write({ type: "text-start", id });
    for (const word of value.split(/(?<= )/)) {
      write({ type: "text-delta", id, delta: word });
      await wait(28);
    }
    write({ type: "text-end", id });
  };

  return { write, wait, text };
}

// ---------------------------------------------------------------------------
// Reading the conversation

const textOf = (m: PaddyMessage | undefined) =>
  m?.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ") ?? "";

type WorksheetPart = Extract<PaddyMessage["parts"][number], { type: "tool-createWorksheet" }>;

function worksheetRuns(messages: PaddyMessage[]) {
  const runs: { input: WorksheetToolInput; output?: WorksheetToolOutput; final: boolean }[] = [];
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type !== "tool-createWorksheet") continue;
      const part = p as WorksheetPart;
      if (part.state === "output-available") {
        runs.push({ input: part.input, output: part.output, final: !part.preliminary });
      } else if (part.state === "input-available") {
        runs.push({ input: part.input, final: false });
      }
    }
  }
  return runs;
}

function latestReadyVersion(messages: PaddyMessage[]) {
  const ready = worksheetRuns(messages).filter((r) => r.output?.status === "ready" && r.output.result);
  return ready.at(-1)?.output?.result?.version;
}

function parseGrade(text: string): string | undefined {
  const m =
    text.match(/(?:klasse|kl\.?|jahrgangsstufe|jahrgang|jg\.?)\s*(\d{1,2})/i) ??
    text.match(/(\d{1,2})\s*\.?\s*(?:klasse|kl\b)/i);
  return m ? `Klasse ${m[1]}` : undefined;
}

const has = (text: string, re: RegExp) => re.test(text.toLowerCase());

// ---------------------------------------------------------------------------
// Routing: what would Magic Chat do with this message?

async function route(messages: PaddyMessage[], w: Writer) {
  const last = messages.at(-1);

  // Continuation: the teacher just answered a clarifying question.
  if (last?.role === "assistant") {
    const clarify = last.parts.find(
      (p) => p.type === "tool-askClarification" && p.state === "output-available",
    ) as { output: ClarifyOutput } | undefined;
    if (clarify) {
      const grade = clarify.output.answer;
      await runWorksheet(w, baseInput("create", 1, grade), {
        continuation: true,
        preface: clarify.output.skipped ? `Alles klar, ich gehe von ${grade} aus.` : undefined,
      });
    }
    return;
  }

  const text = textOf(last).trim();
  const ready = latestReadyVersion(messages);
  const runs = worksheetRuns(messages);

  if (has(text, /word-datei erneut/)) {
    const failed = runs.filter((r) => r.output?.status === "export-failed").at(-1);
    return runWorksheet(w, { ...(failed?.input ?? baseInput("create", 1)), request: "export" });
  }

  if (has(text, /^erneut versuchen/)) {
    const failed = runs.filter((r) => r.output?.status === "failed").at(-1);
    if (failed) return runWorksheet(w, failed.input);
  }

  if (ready && has(text, /kürzer|kürzen|zu lang|weniger aufgaben/)) {
    if (ready >= 2) {
      return reply(w, "Das ist schon die gekürzte Fassung. Im Prototyp gibt es nur diese eine Kürzung; in der echten Version würde ich weiter kürzen und dir v3 zeigen.");
    }
    const base = runs.find((r) => r.output?.result?.version === ready)?.input;
    return runWorksheet(w, {
      ...(base ?? baseInput("create", 1)),
      request: "revise",
      change: "kürzer",
      targetVersion: ready + 1,
    });
  }

  if (ready) {
    return reply(
      w,
      "Im Prototyp ist nur »Kürzer« durchgespielt. In der echten Version würde ich die Änderung jetzt gezielt umsetzen, alles andere unverändert lassen und dir die neue Version zeigen.",
    );
  }

  if (has(text, /arbeitsblatt|\bab\b|worksheet/)) {
    if (!has(text, /fotosynth|photosynth/)) {
      return reply(
        w,
        "Im Prototyp ist nur das Beispiel »Fotosynthese« hinterlegt. Probier zum Beispiel: »Erstelle ein Arbeitsblatt zur Fotosynthese für Klasse 7«.",
      );
    }
    const grade = parseGrade(text);
    if (!grade) return askGrade(w);
    return runWorksheet(w, baseInput("create", 1, grade));
  }

  return reply(
    w,
    "Hier spielen wir nur das Arbeitsblatt durch. Probier: »Erstelle ein Arbeitsblatt zur Fotosynthese für Klasse 7«.",
  );
}

const baseInput = (
  request: WorksheetToolInput["request"],
  targetVersion: number,
  grade = "Klasse 7",
): WorksheetToolInput => ({ request, topic: "Fotosynthese", subject: "Biologie", grade, targetVersion });

async function reply(w: Writer, text: string) {
  w.write({ type: "start" });
  w.write({ type: "start-step" });
  await w.wait(500);
  await w.text(text);
  w.write({ type: "finish-step" });
  w.write({ type: "finish" });
}

// ---------------------------------------------------------------------------
// Clarifying (client-side tool: the UI answers it via addToolOutput)

async function askGrade(w: Writer) {
  const input: ClarifyInput = {
    question: "Für welche Klassenstufe ist das Arbeitsblatt?",
    options: ["Klasse 5–6", "Klasse 7–8", "Klasse 9–10", "Oberstufe"],
    skipLabel: "Einfach loslegen",
    defaultValue: "Klasse 7",
  };
  const toolCallId = `clarify-${crypto.randomUUID()}`;
  w.write({ type: "start" });
  w.write({ type: "start-step" });
  await w.wait(600);
  // No preamble: the question card is the whole reply.
  w.write({ type: "tool-input-start", toolCallId, toolName: "askClarification" });
  await w.wait(200);
  w.write({ type: "tool-input-available", toolCallId, toolName: "askClarification", input });
  w.write({ type: "finish-step" });
  w.write({ type: "finish" });
}

// ---------------------------------------------------------------------------
// The worksheet tool run

type RunOptions = { continuation?: boolean; preface?: string };

async function runWorksheet(w: Writer, input: WorksheetToolInput, opts: RunOptions = {}) {
  const settings = demoSettings.get();
  const toolCallId = `ws-${crypto.randomUUID()}`;
  const target = worksheetFor(input.targetVersion, input.grade);
  const totalBlocks = target.blocks.length;

  const steps: Step[] = stepsFor(input);
  let blocksReady = input.request === "export" ? totalBlocks : 0;
  let slow = false;

  const set = (id: string, patch: Partial<Step>) => {
    const s = steps.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  };
  const emit = (status: WorksheetToolOutput["status"] = "working", extra: Partial<WorksheetToolOutput> = {}) =>
    w.write({
      type: "tool-output-available",
      toolCallId,
      output: {
        status,
        steps: steps.map((s) => ({ ...s })),
        blocksReady,
        slow,
        estimateMs: ESTIMATE_MS[input.request] / demoSettings.get().speed,
        ...extra,
      } satisfies WorksheetToolOutput,
      preliminary: status === "working",
    });

  const fail = async (stepId: string, error: string, status: "failed" | "export-failed", failureMessage: string, recovery?: Chip) => {
    set(stepId, { status: "failed", error, detail: undefined });
    emit(status, { failureMessage });
    w.write({ type: "finish-step" });
    if (recovery) {
      // A new step, so the failed tool call is closed before the recovery action.
      w.write({ type: "start-step" });
      w.write({ type: "data-recovery", data: recovery });
      w.write({ type: "finish-step" });
    }
    w.write({ type: "finish" });
  };

  if (!opts.continuation) w.write({ type: "start" });
  w.write({ type: "start-step" });
  if (opts.preface) await w.text(opts.preface);
  w.write({ type: "tool-input-start", toolCallId, toolName: "createWorksheet" });
  await w.wait(450);
  w.write({ type: "tool-input-available", toolCallId, toolName: "createWorksheet", input });
  emit();
  await w.wait(300);

  // ---- create -------------------------------------------------------------
  if (input.request === "create") {
    set("context", { status: "running", detail: "Ordner »Lehrpläne« · 3 Dokumente" });
    emit();
    await w.wait(2500);
    set("context", { status: "done", detail: undefined });
    emit();
    const src = target.sources[0];
    if (src) {
      w.write({
        type: "source-document",
        sourceId: "src-lehrplan",
        mediaType: "application/pdf",
        title: src.title,
        filename: src.detail,
      });
    }

    set("tasks", { status: "running", detail: "Infotext schreiben" });
    emit();
    await w.wait(2000);
    blocksReady = 1;
    const tasks = target.blocks.length - 1;
    for (let i = 1; i <= tasks; i++) {
      set("tasks", { detail: `Aufgabe ${i} von ${tasks}` });
      emit();
      if (i === 3 && settings.failCreate) {
        demoSettings.set({ failCreate: false });
        return fail(
          "tasks",
          "Die Aufgaben konnten nicht fertig erstellt werden.",
          "failed",
          "Das Arbeitsblatt konnte nicht erstellt werden. Es wurde nichts gespeichert.",
          { label: "Erneut versuchen", prompt: "Erneut versuchen" },
        );
      }
      if (i === 3 && settings.slow) {
        demoSettings.set({ slow: false });
        await w.wait(3500);
        slow = true;
        emit();
        await w.wait(6000);
        slow = false;
      } else {
        await w.wait(2200);
      }
      blocksReady = i + 1;
      emit();
    }
    set("tasks", { status: "done", detail: undefined });
    emit();

    set("answers", { status: "running" });
    emit();
    await w.wait(1800);
    set("answers", { status: "done" });
    emit();
  }

  // ---- revise -------------------------------------------------------------
  if (input.request === "revise") {
    for (const id of ["shorten-info", "drop-task"]) {
      set(id, { status: "running" });
      emit();
      await w.wait(1100);
      if (id === "drop-task" && settings.failRevise) {
        demoSettings.set({ failRevise: false });
        return fail(
          id,
          "Die Änderung konnte nicht übernommen werden.",
          "failed",
          `v${input.targetVersion} konnte nicht erstellt werden. v${input.targetVersion - 1} ist unverändert.`,
          { label: "Erneut versuchen", prompt: "Erneut versuchen" },
        );
      }
      set(id, { status: "done" });
      emit();
    }
    set("answers", { status: "running" });
    emit();
    await w.wait(800);
    set("answers", { status: "done" });
    emit();
  }

  // ---- Word file (all requests) --------------------------------------------
  set("docx", { status: "running" });
  emit();
  await w.wait(2000);
  if (settings.failExport && input.request !== "export") {
    demoSettings.set({ failExport: false });
    blocksReady = totalBlocks;
    return fail(
      "docx",
      "Die Word-Datei konnte nicht erzeugt werden.",
      "export-failed",
      "Der Inhalt ist fertig, aber die Word-Datei fehlt noch.",
    );
  }
  set("docx", { status: "done" });
  blocksReady = totalBlocks;

  const result = {
    version: target.version,
    title: target.title,
    pages: pageCount(target),
    tasks: taskCount(target),
    answerKey: target.answerKey,
    durationMin: target.durationMin,
    downloadUrl: `/api/worksheet/${target.version}?grade=${encodeURIComponent(input.grade)}`,
    changes: input.request === "revise" ? v2Changes : undefined,
  };
  emit("ready", { result });
  w.write({ type: "finish-step" });

  // ---- Summary and next steps --------------------------------------------------
  // Confident hand-over: say what is in it, don't ask for approval. Changes go through
  // the chips and the chat. Defaults the teacher never chose are named before the run.
  w.write({ type: "start-step" });
  await w.wait(250);
  if (input.request === "create") {
    await w.text(
      `Dein Arbeitsblatt ist fertig: ein Infotext und ${numberWord(result.tasks)} Aufgaben vom Lückentext bis zur Begründung, dazu ein Lösungsblatt. Passt für etwa ${result.durationMin} Minuten ${inGrade(input.grade)}.`,
    );
  } else if (input.request === "revise") {
    // Working time lives in the green change log on the card only.
    await w.text(`Kürzer und weiterhin vollständig: ${numberWord(result.tasks)} Aufgaben.`);
  } else {
    await w.text("Die Word-Datei ist jetzt da.");
  }
  w.write({
    type: "data-suggestions",
    data: {
      items: [
        { label: "Kürzer", prompt: "Mach das Arbeitsblatt kürzer" },
        { label: "Einfachere Sprache", prompt: "Formuliere die Aufgaben in einfacherer Sprache" },
        { label: "Differenzieren (2 Niveaus)", prompt: "Erstelle zwei Niveaus: Basis und erweitert" },
        { label: "Ohne Lösungsblatt", prompt: "Entferne das Lösungsblatt" },
        { label: "Mehr Anwendungsaufgaben", prompt: "Füge mehr Anwendungsaufgaben hinzu" },
      ].filter((c) => !(input.request === "revise" && c.label === "Kürzer")),
    },
  });
  w.write({ type: "finish-step" });
  w.write({ type: "finish" });
}

/**
 * What a history-based estimate would return per request type (typical run length).
 * In production: median duration of past runs of this tool, adjusted for attachments etc.
 */
const ESTIMATE_MS: Record<WorksheetToolInput["request"], number> = {
  create: 20_000,
  revise: 6_000,
  export: 2_800,
};

const numberWord = (n: number) =>
  ["null", "eine", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn"][n] ?? String(n);

/** "in Klasse 7", "in der Oberstufe" */
const inGrade = (grade: string) => (/^klasse/i.test(grade) ? `in ${grade}` : `in der ${grade}`);

function stepsFor(input: WorksheetToolInput): Step[] {
  const docx = (label: string, doneLabel: string): Step => ({ id: "docx", label, doneLabel, status: "pending" });
  if (input.request === "revise") {
    return [
      { id: "shorten-info", label: "Infotext kürzen", doneLabel: "Infotext gekürzt", status: "pending" },
      { id: "drop-task", label: "Aufgabe 4 streichen", doneLabel: "Aufgabe 4 gestrichen", status: "pending" },
      { id: "answers", label: "Lösungsblatt anpassen", doneLabel: "Lösungsblatt angepasst", status: "pending" },
      docx("Word-Dokument aktualisieren", "Word-Dokument aktualisiert"),
    ];
  }
  if (input.request === "export") return [docx("Word-Datei erzeugen", "Word-Datei erzeugt")];
  return [
    { id: "context", label: "Lehrplan durchsuchen", doneLabel: "Lehrplan durchsucht", status: "pending" },
    { id: "tasks", label: "Aufgaben entwerfen", doneLabel: "Infotext und 5 Aufgaben entworfen", status: "pending" },
    { id: "answers", label: "Lösungsblatt erstellen", doneLabel: "Lösungsblatt erstellt", status: "pending" },
    docx("Word-Dokument setzen", "Word-Dokument gesetzt"),
  ];
}
