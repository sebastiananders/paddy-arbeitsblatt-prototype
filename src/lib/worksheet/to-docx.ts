import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import type { Block, Inline, Worksheet } from "./types";
import { totalPoints } from "./types";

/**
 * Renders a structured worksheet into a real .docx.
 * Mirrors the canvas preview (src/components/canvas/worksheet-page.tsx) block by block.
 */

const FONT = "Arial";
const CONTENT_WIDTH = 9638; // A4 (11906 DXA) minus 2 cm margins on both sides
const GAP = "_".repeat(16);
const GREY = "6B6B6B";

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const thin = { style: BorderStyle.SINGLE, size: 4, color: "8A8A8A" };
const thinBorders = { top: thin, bottom: thin, left: thin, right: thin };

const run = (text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
  new TextRun({ text, font: FONT, size: opts.size ?? 22, bold: opts.bold, color: opts.color });

const inlineRuns = (parts: Inline[], gap = GAP, answers = false): TextRun[] =>
  parts.map((p) =>
    typeof p === "string" ? run(p) : answers ? run(p.gap, { bold: true }) : run(gap),
  );


function boxed(children: Paragraph[], shade = "F3F3F1") {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            borders: thinBorders,
            shading: { type: ShadingType.CLEAR, fill: shade, color: "auto" },
            margins: { top: 140, bottom: 140, left: 200, right: 200 },
            children,
          }),
        ],
      }),
    ],
  });
}

function taskHeading(b: Extract<Block, { kind: "task" }>, pageBreakBefore: boolean) {
  return new Paragraph({
    keepNext: true,
    pageBreakBefore,
    spacing: { before: 280, after: 80 },
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
    children: [
      run(`Aufgabe ${b.number}`, { bold: true, size: 24 }),
      run(`  ·  ${b.title}`, { size: 24 }),
      run(`\t___ / ${b.points} P.`, { size: 20, color: GREY }),
    ],
  });
}

/** Writing lines as table rows: adjacent paragraph borders would merge into one line in Word. */
function writingLines(count: number) {
  const line = { style: BorderStyle.SINGLE, size: 4, color: "9A9A9A" };
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: Array.from(
      { length: count },
      () =>
        new TableRow({
          height: { value: 520, rule: "exact" },
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH, type: WidthType.DXA },
              borders: { ...noBorders, bottom: line },
              children: [new Paragraph({ children: [run(" ")] })],
            }),
          ],
        }),
    ),
  });
}

function renderTask(b: Extract<Block, { kind: "task" }>, figure: Buffer, pageBreakBefore: boolean): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [
    taskHeading(b, pageBreakBefore),
    new Paragraph({ keepNext: true, spacing: { after: 140 }, children: [run(b.instruction)] }),
  ];
  const body = b.body;

  switch (body.type) {
    case "gap-text":
      out.push(
        boxed(
          [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [run(body.wordBank.join("     ·     "))],
            }),
          ],
          "FFFFFF",
        ),
        new Paragraph({
          spacing: { before: 160, line: 480 },
          children: inlineRuns(body.segments),
        }),
      );
      break;

    case "equation":
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 120 },
          children: [
            ...inlineRuns(body.left, "_".repeat(14)),
            run("   ⟶   ", { bold: true }),
            ...inlineRuns(body.right, "_".repeat(14)),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [run(`Bedingungen: ${body.arrowLabel}`, { size: 18, color: GREY })],
        }),
      );
      break;

    case "labeling": {
      // Figure, term bank and answer lines live in one unsplittable row,
      // so the figure never ends up on a different page than its answers.
      const box = { style: BorderStyle.SINGLE, size: 4, color: "8A8A8A", space: 6 };
      const inner: Paragraph[] = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new ImageRun({
              type: "png",
              data: figure,
              transformation: { width: 380, height: 211 },
              altText: { title: "Blatt", description: "Blatt mit Pfeilen A bis D", name: "leaf-exchange" },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: box, bottom: box, left: box, right: box },
          children: [run(body.termBank.join("     ·     "))],
        }),
      ];
      for (let i = 0; i < body.labels.length; i += 2) {
        const [a, c] = [body.labels[i], body.labels[i + 1]];
        inner.push(
          new Paragraph({
            spacing: { before: 220 },
            tabStops: [
              { type: TabStopType.LEFT, position: 4400, leader: "underscore" },
              { type: TabStopType.LEFT, position: 4900 },
              { type: TabStopType.LEFT, position: CONTENT_WIDTH - 240, leader: "underscore" },
            ],
            children: [run(`${a.key}  `, { bold: true }), run("\t\t"), ...(c ? [run(`${c.key}  `, { bold: true }), run("\t")] : [])],
          }),
        );
      }
      out.push(
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: [CONTENT_WIDTH],
          rows: [
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: CONTENT_WIDTH, type: WidthType.DXA },
                  borders: noBorders,
                  margins: { left: 0, right: 0 },
                  children: inner,
                }),
              ],
            }),
          ],
        }),
      );
      break;
    }

    case "table": {
      const widths = [2300, 3200, CONTENT_WIDTH - 5500];
      const head = new TableRow({
        tableHeader: true,
        children: body.columns.map(
          (c, i) =>
            new TableCell({
              width: { size: widths[i], type: WidthType.DXA },
              borders: thinBorders,
              shading: { type: ShadingType.CLEAR, fill: "EDEDEA", color: "auto" },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({ children: [run(c, { bold: true })] })],
            }),
        ),
      });
      const rows = body.rows.map(
        (r) =>
          new TableRow({
            height: { value: 1300, rule: "atLeast" },
            children: r.map(
              (cellValue, i) =>
                new TableCell({
                  width: { size: widths[i], type: WidthType.DXA },
                  borders: thinBorders,
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: typeof cellValue === "string" ? [run(cellValue)] : [] })],
                }),
            ),
          }),
      );
      out.push(
        new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...rows] }),
      );
      break;
    }

    case "writing":
      out.push(writingLines(body.lines));
      break;
  }
  return out;
}

function renderSolutions(ws: Worksheet): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { after: 60 },
      children: [run("Lösungen", { bold: true, size: 32 })],
    }),
    new Paragraph({
      spacing: { after: 240 },
      children: [run(`${ws.title} · nur für die Lehrkraft`, { color: GREY })],
    }),
  ];
  for (const b of ws.blocks) {
    if (b.kind !== "task") continue;
    out.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [run(`Aufgabe ${b.number}`, { bold: true }), run(`  ·  ${b.title}`)],
      }),
    );
    const body = b.body;
    const line = (children: ParagraphChild[]) => new Paragraph({ spacing: { after: 60, line: 320 }, children });
    switch (body.type) {
      case "gap-text":
        out.push(line(inlineRuns(body.segments, GAP, true)));
        break;
      case "equation":
        out.push(line([...inlineRuns(body.left, "", true), run(`  ⟶  `), ...inlineRuns(body.right, "", true)]));
        break;
      case "labeling":
        out.push(line([run(body.labels.map((l) => `${l.key}: ${l.answer}`).join("   ·   "))]));
        break;
      case "table":
        for (const r of body.rows) {
          const answer = r.find((c): c is { gap: string } => typeof c !== "string");
          if (answer) out.push(line([run(`${r[0]}: `, { bold: true }), run(answer.gap)]));
        }
        break;
      case "writing":
        out.push(line([run("Erwartungshorizont: ", { bold: true }), run(body.answer)]));
        break;
    }
  }
  return out;
}

export async function worksheetToDocx(ws: Worksheet, figure: Buffer): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      spacing: { after: 280 },
      tabStops: [
        { type: TabStopType.LEFT, position: 4300, leader: "underscore" },
        { type: TabStopType.LEFT, position: 4600 },
        { type: TabStopType.LEFT, position: 6900, leader: "underscore" },
        { type: TabStopType.LEFT, position: 7200 },
        { type: TabStopType.LEFT, position: CONTENT_WIDTH, leader: "underscore" },
      ],
      children: [run("Name: "), run("\t\t"), run("Klasse: "), run("\t\t"), run("Datum: "), run("\t")],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [run(ws.title, { bold: true, size: 34 })] }),
  ];

  for (const b of ws.blocks) {
    if (b.kind === "info") {
      children.push(
        boxed([
          new Paragraph({ spacing: { after: 80 }, children: [run(`Info: ${b.title}`, { bold: true })] }),
          ...b.paragraphs.map((p, i) => new Paragraph({ spacing: { after: i === b.paragraphs.length - 1 ? 0 : 100, line: 300 }, children: [run(p)] })),
        ]),
      );
    } else {
      children.push(...renderTask(b, figure, ws.pageStarts.includes(b.id)));
    }
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 120 },
      children: [run(`Gesamt: ___ / ${totalPoints(ws)} P.`, { bold: true })],
    }),
  );
  if (ws.answerKey) children.push(...renderSolutions(ws));

  const doc = new Document({
    creator: "paddy",
    title: ws.title,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 567 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH }],
                children: [run(`${ws.subject} · ${ws.grade}`, { size: 18, color: GREY }), run(`\tFotosynthese`, { size: 18, color: GREY })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ font: FONT, size: 18, color: GREY, children: ["Seite ", PageNumber.CURRENT, " von ", PageNumber.TOTAL_PAGES] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
