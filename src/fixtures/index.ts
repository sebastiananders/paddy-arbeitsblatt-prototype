import { fotosyntheseV1, fotosyntheseV2, v2Changes } from "./fotosynthese";
import type { Worksheet } from "@/lib/worksheet/types";

export { v2Changes };

const versions: Record<number, Worksheet> = { 1: fotosyntheseV1, 2: fotosyntheseV2 };

/** The worksheet for a version, with the grade the teacher asked for in the header. */
export function worksheetFor(version: number, grade?: string): Worksheet {
  const ws = versions[version] ?? fotosyntheseV1;
  return grade ? { ...ws, grade } : ws;
}
