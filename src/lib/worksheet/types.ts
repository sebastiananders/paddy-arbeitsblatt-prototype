/**
 * One structured source for a worksheet.
 * The canvas preview (React) and the .docx download are both rendered from this.
 * That is the bet behind dev question #1: if generation produces this shape,
 * preview and file can never drift apart, and the document can stream in task by task.
 */

/** A piece of inline text, or a gap with its expected answer. */
export type Inline = string | { gap: string };

export type TaskBody =
  | { type: "gap-text"; wordBank: string[]; segments: Inline[] }
  | { type: "equation"; left: Inline[]; arrowLabel: string; right: Inline[] }
  | {
      type: "labeling";
      figure: "leaf-exchange";
      termBank: string[];
      labels: { key: string; answer: string }[];
    }
  | { type: "table"; columns: string[]; rows: Inline[][] }
  | { type: "writing"; lines: number; answer: string };

export type Block =
  | {
      kind: "info";
      id: string;
      title: string;
      paragraphs: string[];
    }
  | {
      kind: "task";
      id: string;
      number: number;
      /** Operator as used in German curricula: Nenne, Ergänze, Erkläre, Begründe … */
      operator: string;
      title: string;
      instruction: string;
      points: number;
      body: TaskBody;
    };

export type Worksheet = {
  id: string;
  version: number;
  title: string;
  subject: string;
  grade: string;
  level: string;
  durationMin: number;
  blocks: Block[];
  /** Block ids that start a new page. Preview and .docx both paginate from this list. */
  pageStarts: string[];
  /** Separate answer key page at the end. */
  answerKey: boolean;
  /** Sources actually used during generation. Empty means the panel is hidden. */
  sources: { title: string; detail: string }[];
};

export const totalPoints = (ws: Worksheet) =>
  ws.blocks.reduce((sum, b) => (b.kind === "task" ? sum + b.points : sum), 0);

export const taskCount = (ws: Worksheet) =>
  ws.blocks.filter((b) => b.kind === "task").length;

/** Splits blocks into pages using pageStarts. */
export function paginate(ws: Worksheet, blocks: Block[] = ws.blocks): Block[][] {
  const pages: Block[][] = [[]];
  for (const b of blocks) {
    if (ws.pageStarts.includes(b.id) && pages[pages.length - 1].length > 0) pages.push([]);
    pages[pages.length - 1].push(b);
  }
  return pages;
}

/** Task pages plus the answer key page. */
export const pageCount = (ws: Worksheet) => paginate(ws).length + (ws.answerKey ? 1 : 0);
