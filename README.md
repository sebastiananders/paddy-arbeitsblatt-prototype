# paddy · Arbeitsblatt → Word (Prototyp v0)

Prototype of the Magic Chat flow: a teacher asks for a worksheet, Magic Chat routes it to the
Arbeitsblatt tool, progress streams in honestly, the document fills a canvas live, and the
result downloads as a real `.docx`. Spec: Notion › Arbeitsblatt › *Flow & States v0*.

## What is real, what is scripted

| Part | Status |
|---|---|
| Chat UI on `useChat` (AI SDK v7) | real |
| Message contract (tool parts, data parts, source parts) | real — see `src/lib/chat/types.ts` |
| Streaming | **scripted**: `ScriptedTransport` replays AI SDK UI message chunks with timing |
| Worksheet content | fixture: Biologie Kl. 7 Fotosynthese, v1 + shortened v2 |
| `.docx` download | real — rendered from the same structured worksheet as the preview |

## The bet for dev (feasibility question #1)

Generate the worksheet as **structured data** (`src/lib/worksheet/types.ts`), not as a finished
file. Then:

- the canvas preview and the `.docx` render from one source, so they never drift
  (`components/canvas/worksheet-paper.tsx` ↔ `lib/worksheet/to-docx.ts`, same page breaks via `pageStarts`)
- the document can stream in block by block (`blocksReady` in the tool output)
- a revision can touch single blocks and report what changed (`changes` on the result)

## Message contract

- `tool-createWorksheet` — input = what Magic Chat understood (intent line). Preliminary outputs
  stream `steps` + `blocksReady`; a step is only `done` when its artifact exists; `result` only
  appears when the Word file is downloadable. Status: `working | ready | failed | export-failed`.
- `tool-askClarification` — client-side tool (no execute). The UI answers with `addToolOutput`,
  the chat continues automatically (`sendAutomaticallyWhen` in `components/workspace.tsx`).
- `data-assumptions`, `data-suggestions`, `data-recovery` — chips under a result / after a failure.
- `source-document` — sources actually used.

To connect the real harness, replace `new ScriptedTransport()` in `components/workspace.tsx` with
`new DefaultChatTransport({ api: "/api/chat" })` and stream the same parts from the server.

## Demo controls

Bottom-left **Demo** button: start scenarios, make the next run fail (creation, Word export, v2),
simulate a slow step, toggle canvas auto-open, change speed. Not part of the product.

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npx tsx scripts/build-docx.mts out   # writes both .docx versions locally
```

Design tokens come from the paddy Figma design system (`src/app/globals.css`, values marked
"approx" still need checking).
