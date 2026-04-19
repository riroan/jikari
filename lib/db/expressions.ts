import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type { ExpressionCard, Register } from "../types";

const REGISTERS: readonly Register[] = ["casual", "polite", "humble"];

function parseRegister(value: unknown): Register {
  // ENUM constraint at DB level + validator at ingest means this should always
  // be one of 3 values. Fall back to "casual" defensively rather than throwing
  // on a stale/corrupt row so the rest of the deck still loads.
  if (typeof value === "string" && (REGISTERS as readonly string[]).includes(value)) {
    return value as Register;
  }
  return "casual";
}

export async function getAllExpressions(): Promise<ExpressionCard[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, situation_ko, expression_jp, ruby, register, translation_ko, note_ko FROM expression_cards ORDER BY id",
  );
  return rows.map((r) => ({
    id: r.id as string,
    situation_ko: r.situation_ko as string,
    expression_jp: r.expression_jp as string,
    ruby: (r.ruby as string | null) ?? undefined,
    register: parseRegister(r.register),
    translation_ko: r.translation_ko as string,
    note_ko: (r.note_ko as string | null) ?? undefined,
  }));
}
