"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Block, Inline, Worksheet } from "@/lib/worksheet/types";
import { paginate, pageCount, totalPoints } from "@/lib/worksheet/types";

/**
 * A4 preview rendered from the same structured worksheet as the .docx
 * (src/lib/worksheet/to-docx.ts). Sizes follow Word: 96 dpi, 2 cm margins, Arial 11 pt.
 */

export const PAGE_W = 794;
export const PAGE_H = 1123;
const MARGIN = 76;
const GREY = "#6b6b6b";

const Gap = ({ width = 128 }: { width?: number }) => (
  <span className="mx-0.5 inline-block translate-y-[3px] border-b border-[#555]" style={{ width }} />
);

const inline = (parts: Inline[], gapWidth?: number) =>
  parts.map((p, i) => (typeof p === "string" ? <span key={i}>{p}</span> : <Gap key={i} width={gapWidth} />));

function Box({ children, shaded }: { children: ReactNode; shaded?: boolean }) {
  return (
    <div className="border border-[#8a8a8a] px-[13px] py-[9px]" style={{ background: shaded ? "#f3f3f1" : "#fff" }}>
      {children}
    </div>
  );
}

function TaskBlock({ b }: { b: Extract<Block, { kind: "task" }> }) {
  const body = b.body;
  return (
    <section className="mt-[19px]">
      <div className="flex items-baseline justify-between">
        <p className="text-[16px]">
          <b>Aufgabe {b.number}</b>
          <span>{"  ·  "}{b.title}</span>
        </p>
        <span className="text-[13px]" style={{ color: GREY }}>
          ___ / {b.points} P.
        </span>
      </div>
      <p className="mt-[5px] mb-[9px]">{b.instruction}</p>

      {body.type === "gap-text" && (
        <>
          <Box>
            <p className="text-center">{body.wordBank.join("   ·   ")}</p>
          </Box>
          <p className="mt-[11px] leading-[2.2]">{inline(body.segments)}</p>
        </>
      )}

      {body.type === "equation" && (
        <div className="mt-[13px] text-center">
          <p>
            {inline(body.left, 112)}
            <b className="mx-3">⟶</b>
            {inline(body.right, 112)}
          </p>
          <p className="mt-[6px] text-[12px]" style={{ color: GREY }}>
            Bedingungen: {body.arrowLabel}
          </p>
        </div>
      )}

      {body.type === "labeling" && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figures/leaf-exchange.svg" alt="Blatt mit Pfeilen A bis D" width={380} height={211} className="mx-auto mb-[11px] block" />
          <div className="border-y border-[#8a8a8a] py-[5px] text-center">{body.termBank.join("   ·   ")}</div>
          <div className="mt-[6px] grid grid-cols-2 gap-x-8">
            {body.labels.map((l) => (
              <p key={l.key} className="mt-[13px] flex items-end gap-2">
                <b>{l.key}</b>
                <span className="flex-1 border-b border-[#555]" />
              </p>
            ))}
          </div>
        </div>
      )}

      {body.type === "table" && (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {body.columns.map((c) => (
                <th key={c} className="border border-[#8a8a8a] bg-[#ededea] px-2 py-[5px] font-bold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.rows.map((r, i) => (
              <tr key={i} className="h-[87px] align-top">
                {r.map((c, j) => (
                  <td key={j} className="border border-[#8a8a8a] px-2 py-[5px]" style={{ width: ["24%", "33%", "43%"][j] }}>
                    {typeof c === "string" ? c : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {body.type === "writing" && (
        <div>
          {Array.from({ length: body.lines }, (_, i) => (
            <div key={i} className="h-[35px] border-b border-[#9a9a9a]" />
          ))}
        </div>
      )}
    </section>
  );
}

function InfoBlock({ b }: { b: Extract<Block, { kind: "info" }> }) {
  return (
    <Box shaded>
      <p className="mb-[5px] font-bold">Info: {b.title}</p>
      {b.paragraphs.map((p, i) => (
        <p key={i} className={i < b.paragraphs.length - 1 ? "mb-[7px]" : ""}>
          {p}
        </p>
      ))}
    </Box>
  );
}

/** Placeholder for the block that is being written right now. */
function WritingSkeleton() {
  return (
    <div data-writing className="mt-[19px] space-y-2" aria-label="Wird geschrieben">
      <div className="h-[14px] w-1/3 animate-pulse-soft rounded-sm bg-[#e6e6ef]" />
      <div className="h-[12px] w-11/12 animate-pulse-soft rounded-sm bg-[#efeff5]" />
      <div className="h-[12px] w-4/5 animate-pulse-soft rounded-sm bg-[#efeff5]" />
      <div className="h-[56px] w-full animate-pulse-soft rounded-sm bg-[#f3f3f8]" />
    </div>
  );
}

function PageFrame({ ws, index, total, children }: { ws: Worksheet; index: number; total: number; children: ReactNode }) {
  return (
    <div
      className="relative bg-white text-[14.67px] leading-[1.38] text-black"
      style={{ width: PAGE_W, height: PAGE_H, padding: MARGIN, fontFamily: "Arial, Helvetica, sans-serif" }}
    >
      <div className="absolute inset-x-[76px] top-[38px] flex justify-between text-[12px]" style={{ color: GREY }}>
        <span>
          {ws.subject} · {ws.grade}
        </span>
        <span>Fotosynthese</span>
      </div>
      {children}
      <div className="absolute right-[76px] bottom-[38px] text-[12px]" style={{ color: GREY }}>
        Seite {index + 1} von {total}
      </div>
    </div>
  );
}

function SolutionsPage({ ws }: { ws: Worksheet }) {
  return (
    <>
      <p className="text-[21px] font-bold">Lösungen</p>
      <p className="mb-[16px]" style={{ color: GREY }}>
        {ws.title} · nur für die Lehrkraft
      </p>
      {ws.blocks.map((b) => {
        if (b.kind !== "task") return null;
        const body = b.body;
        return (
          <div key={b.id} className="mt-[13px]">
            <p className="mb-[4px]">
              <b>Aufgabe {b.number}</b>
              {"  ·  "}
              {b.title}
            </p>
            {body.type === "gap-text" && (
              <p>{body.segments.map((s, i) => (typeof s === "string" ? <span key={i}>{s}</span> : <b key={i}>{s.gap}</b>))}</p>
            )}
            {body.type === "equation" && (
              <p>
                {[...body.left, " ⟶ ", ...body.right].map((s, i) => (typeof s === "string" ? <span key={i}>{s}</span> : <b key={i}>{s.gap}</b>))}
              </p>
            )}
            {body.type === "labeling" && <p>{body.labels.map((l) => `${l.key}: ${l.answer}`).join("   ·   ")}</p>}
            {body.type === "table" &&
              body.rows.map((r, i) => {
                const a = r.find((c): c is { gap: string } => typeof c !== "string");
                return (
                  <p key={i}>
                    <b>{r[0] as string}: </b>
                    {a?.gap}
                  </p>
                );
              })}
            {body.type === "writing" && (
              <p>
                <b>Erwartungshorizont: </b>
                {body.answer}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

type PaperProps = {
  ws: Worksheet;
  /** Blocks written so far; undefined = complete. */
  blocksReady?: number;
  /** Render only the first page (thumbnails). */
  firstPageOnly?: boolean;
};

/** Returns the A4 pages as unscaled 794×1123 elements. */
export function worksheetPages({ ws, blocksReady, firstPageOnly }: PaperProps): ReactNode[] {
  const building = blocksReady !== undefined && blocksReady < ws.blocks.length;
  const visible = building ? ws.blocks.slice(0, blocksReady) : ws.blocks;
  const pages = paginate(ws, visible);
  const total = pageCount(ws);

  const out = pages.map((blocks, i) => (
    <PageFrame key={`p${i}`} ws={ws} index={i} total={total}>
      {i === 0 && (
        <>
          <div className="mb-[19px] flex gap-6">
            {["Name:", "Klasse:", "Datum:"].map((l, j) => (
              <span key={l} className="flex flex-1 items-end gap-1" style={{ flexGrow: [2.1, 1, 1][j] }}>
                {l}
                <span className="flex-1 border-b border-[#555]" />
              </span>
            ))}
          </div>
          <h1 className="mb-[13px] text-[22.67px] font-bold">{ws.title}</h1>
        </>
      )}
      {blocks.map((b) => (b.kind === "info" ? <InfoBlock key={b.id} b={b} /> : <TaskBlock key={b.id} b={b} />))}
      {building && i === pages.length - 1 && <WritingSkeleton />}
      {!building && i === pages.length - 1 && (
        <p className="mt-[8px] text-right font-bold">Gesamt: ___ / {totalPoints(ws)} P.</p>
      )}
    </PageFrame>
  ));

  if (!building && ws.answerKey) {
    out.push(
      <PageFrame key="solutions" ws={ws} index={out.length} total={total}>
        <SolutionsPage ws={ws} />
      </PageFrame>,
    );
  }
  return firstPageOnly ? out.slice(0, 1) : out;
}

/** One A4 page scaled to a fixed width. */
export function ScaledPage({ width, children, className }: { width: number; children: ReactNode; className?: string }) {
  const scale = width / PAGE_W;
  return (
    <div className={className} style={{ width, height: PAGE_H * scale, overflow: "hidden" }}>
      <div style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

/** Tracks an element's width for fit-to-width page scaling. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
