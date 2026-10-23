import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { worksheetFor } from "@/fixtures";
import { worksheetToDocx } from "@/lib/worksheet/to-docx";

/** GET /api/worksheet/1?grade=Klasse%207 → Word file rendered from the same structured worksheet as the preview. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/worksheet/[version]">) {
  const { version } = await ctx.params;
  const v = Number(version);
  if (v !== 1 && v !== 2) return new Response("Unbekannte Version", { status: 404 });

  const ws = worksheetFor(v, req.nextUrl.searchParams.get("grade") ?? undefined);
  const figure = await readFile(path.join(process.cwd(), "public/figures/leaf-exchange.png"));
  const buf = await worksheetToDocx(ws, figure);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="Arbeitsblatt-Fotosynthese-v${ws.version}.docx"`,
    },
  });
}
