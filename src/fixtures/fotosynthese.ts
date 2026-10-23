import type { Block, Worksheet } from "@/lib/worksheet/types";

/**
 * Fixture: Biologie, Klasse 7, Fotosynthese.
 * v1 = what paddy generates first (2 Seiten + Lösungsblatt).
 * v2 = after the teacher taps "Kürzer" (1 Seite + Lösungsblatt).
 * Tasks 1–3 and the writing task are byte-identical between versions on purpose:
 * that is the "Alles andere unverändert" promise we want to show.
 */

const source = {
  title: "Schulinterner Lehrplan Biologie Kl. 5–7.pdf",
  detail: "Ordner »Lehrpläne« · Abschnitt Fotosynthese, S. 12",
};

const task1: Block = {
  kind: "task",
  id: "t-gaps",
  number: 1,
  operator: "Ergänze",
  title: "Lückentext",
  instruction:
    "Ergänze den Lückentext mit Wörtern aus dem Wortspeicher. Jedes Wort passt genau einmal.",
  points: 7,
  body: {
    type: "gap-text",
    wordBank: [
      "Chlorophyll",
      "Chloroplasten",
      "Licht",
      "Sauerstoff",
      "Spaltöffnungen",
      "Traubenzucker",
      "Wurzeln",
    ],
    segments: [
      "Pflanzen ernähren sich durch Fotosynthese. Sie findet in den ",
      { gap: "Chloroplasten" },
      " der Blattzellen statt. Der grüne Farbstoff ",
      { gap: "Chlorophyll" },
      " nimmt das ",
      { gap: "Licht" },
      " auf. Wasser gelangt über die ",
      { gap: "Wurzeln" },
      " in die Pflanze, Kohlenstoffdioxid über die ",
      { gap: "Spaltöffnungen" },
      " ins Blatt. Dabei entstehen ",
      { gap: "Traubenzucker" },
      " und ",
      { gap: "Sauerstoff" },
      ".",
    ],
  },
};

const task2: Block = {
  kind: "task",
  id: "t-equation",
  number: 2,
  operator: "Ergänze",
  title: "Wortgleichung",
  instruction: "Vervollständige die Wortgleichung der Fotosynthese.",
  points: 3,
  body: {
    type: "equation",
    left: ["Kohlenstoffdioxid", " + ", { gap: "Wasser" }],
    arrowLabel: "Licht, Chlorophyll",
    right: [{ gap: "Traubenzucker" }, " + ", { gap: "Sauerstoff" }],
  },
};

const task3: Block = {
  kind: "task",
  id: "t-labels",
  number: 3,
  operator: "Beschrifte",
  title: "Was das Blatt aufnimmt und abgibt",
  instruction:
    "Die Abbildung zeigt, welche Stoffe ein Blatt aufnimmt und abgibt. Ordne den Pfeilen A–D die Begriffe zu.",
  points: 4,
  body: {
    type: "labeling",
    figure: "leaf-exchange",
    termBank: ["Wasser", "Sauerstoff", "Licht", "Kohlenstoffdioxid"],
    labels: [
      { key: "A", answer: "Licht" },
      { key: "B", answer: "Kohlenstoffdioxid" },
      { key: "C", answer: "Wasser" },
      { key: "D", answer: "Sauerstoff" },
    ],
  },
};

const taskExperiment: Block = {
  kind: "task",
  id: "t-experiment",
  number: 4,
  operator: "Erkläre",
  title: "Versuch mit der Wasserpest",
  instruction:
    "Ein Zweig der Wasserpflanze Wasserpest steht in einem Glas mit Wasser. Erkläre die Beobachtungen in der Tabelle.",
  points: 4,
  body: {
    type: "table",
    columns: ["Bedingung", "Beobachtung", "Erklärung"],
    rows: [
      [
        "Glas steht im hellen Licht",
        "Am Zweig steigen kleine Gasbläschen auf.",
        {
          gap: "Die Pflanze betreibt Fotosynthese und gibt dabei Sauerstoff ab.",
        },
      ],
      [
        "Glas steht im Dunkeln",
        "Es steigen keine Bläschen auf.",
        {
          gap: "Ohne Licht findet keine Fotosynthese statt, also entsteht kein Sauerstoff.",
        },
      ],
    ],
  },
};

const writingAnswer =
  "Bei der Fotosynthese geben Pflanzen Sauerstoff ab, den Menschen und Tiere zum Atmen brauchen. Außerdem stellen Pflanzen Nährstoffe wie Traubenzucker her. Sie stehen damit am Anfang jeder Nahrungskette: Auch Fleischfresser fressen Tiere, die sich von Pflanzen ernährt haben.";

const taskWriting = (number: number): Block => ({
  kind: "task",
  id: "t-writing",
  number,
  operator: "Begründe",
  title: "Ohne Pflanzen kein Leben?",
  instruction:
    "Begründe, warum Menschen und Tiere ohne Pflanzen nicht leben könnten. Verwende die Begriffe Sauerstoff und Nahrung.",
  points: 4,
  body: { type: "writing", lines: 4, answer: writingAnswer },
});

export const fotosyntheseV1: Worksheet = {
  id: "ws-fotosynthese",
  version: 1,
  title: "Fotosynthese – Wie Pflanzen sich selbst ernähren",
  subject: "Biologie",
  grade: "Klasse 7",
  level: "mittleres Niveau",
  durationMin: 25,
  answerKey: true,
  pageStarts: ["t-labels"],
  sources: [source],
  blocks: [
    {
      kind: "info",
      id: "info",
      title: "Pflanzen als Selbstversorger",
      paragraphs: [
        "Menschen und Tiere müssen Nahrung zu sich nehmen. Pflanzen dagegen stellen ihre Nährstoffe selbst her. Diesen Vorgang nennt man Fotosynthese.",
        "Die Fotosynthese findet in den Blättern statt, genauer in den Chloroplasten der Blattzellen. Sie enthalten den grünen Farbstoff Chlorophyll, der das Sonnenlicht aufnimmt. Mit der Energie des Lichts wandelt die Pflanze Kohlenstoffdioxid und Wasser in Traubenzucker und Sauerstoff um.",
        "Das Wasser nimmt die Pflanze über die Wurzeln auf. Es gelangt durch die Leitbündel bis in die Blätter. Das Kohlenstoffdioxid stammt aus der Luft und gelangt durch die Spaltöffnungen an der Blattunterseite ins Blatt. Über die Spaltöffnungen gibt die Pflanze auch den Sauerstoff ab.",
        "Den Traubenzucker nutzt die Pflanze als Energiequelle und als Baustoff für ihr Wachstum. Einen Teil wandelt sie in Stärke um und speichert ihn, zum Beispiel in Kartoffelknollen.",
      ],
    },
    task1,
    task2,
    task3,
    taskExperiment,
    taskWriting(5),
  ],
};

export const fotosyntheseV2: Worksheet = {
  ...fotosyntheseV1,
  version: 2,
  durationMin: 15,
  blocks: [
    {
      kind: "info",
      id: "info",
      title: "Pflanzen als Selbstversorger",
      paragraphs: [
        "Pflanzen stellen ihre Nährstoffe selbst her – durch Fotosynthese. Sie findet in den Chloroplasten der Blattzellen statt. Der grüne Farbstoff Chlorophyll nimmt das Licht auf. Mit dessen Energie wandelt die Pflanze Kohlenstoffdioxid und Wasser in Traubenzucker und Sauerstoff um.",
        "Wasser nimmt die Pflanze über die Wurzeln auf. Kohlenstoffdioxid gelangt aus der Luft durch die Spaltöffnungen an der Blattunterseite ins Blatt; durch sie wird auch der Sauerstoff abgegeben. Den Traubenzucker nutzt die Pflanze zum Wachsen oder speichert ihn als Stärke.",
      ],
    },
    task1,
    task2,
    task3,
    taskWriting(4),
  ],
};

/** What the v2 card tells the teacher. Written by the "agent", shown verbatim. */
export const v2Changes = {
  headline: "Bearbeitungszeit jetzt ca. 15 statt 25 Minuten",
  changed: [
    "Infotext auf das Wesentliche gekürzt",
    "Aufgabe 4 (Versuch mit der Wasserpest) gestrichen",
  ],
  unchanged: "Aufgaben 1–3 und die Begründungsaufgabe sind unverändert.",
};
