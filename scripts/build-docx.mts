import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { worksheetToDocx } from "../src/lib/worksheet/to-docx";
import { fotosyntheseV1, fotosyntheseV2 } from "../src/fixtures/fotosynthese";

const fig = readFileSync("public/figures/leaf-exchange.png");
const out = process.argv[2] ?? "out";
mkdirSync(out, { recursive: true });
for (const ws of [fotosyntheseV1, fotosyntheseV2]) {
  const buf = await worksheetToDocx(ws, fig);
  writeFileSync(`${out}/Arbeitsblatt-Fotosynthese-v${ws.version}.docx`, buf);
}
console.log("written");
