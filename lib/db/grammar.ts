import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type {
  GrammarCard,
  GrammarPatternCard,
  JLPTLevel,
  ParticleContrastCard,
} from "../types";

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

type PatternPayload = Omit<GrammarPatternCard, "id" | "type" | "jlpt_level" | "jlptLevel">;
type ParticlePayload = Omit<
  ParticleContrastCard,
  "id" | "type" | "jlpt_level" | "jlptLevel"
>;

/**
 * Read all grammar cards. Shape varies by `type`; we unpack the JSON payload
 * and merge it with the columnar fields (id/type/jlpt_level).
 *
 * Rows with malformed payload JSON are skipped (with a console.warn) rather
 * than crashing the whole query — follows the same spirit as the jp-markup
 * parser's literal fallback.
 */
export async function getAllGrammar(): Promise<GrammarCard[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, type, jlpt_level, payload FROM grammar_cards ORDER BY id"
  );

  const out: GrammarCard[] = [];
  for (const r of rows) {
    const id = r.id as string;
    const type = r.type as GrammarCard["type"];
    const jlptLevel = r.jlpt_level as JLPTLevel;

    if (type === "pattern") {
      const payload = parseJson<PatternPayload | null>(r.payload, null);
      if (!payload) {
        console.warn(`[grammar] skipping pattern card ${id}: invalid payload`);
        continue;
      }
      out.push({ id, type, jlptLevel, ...payload } as GrammarPatternCard);
    } else if (type === "particle_contrast") {
      const payload = parseJson<ParticlePayload | null>(r.payload, null);
      if (!payload) {
        console.warn(`[grammar] skipping particle card ${id}: invalid payload`);
        continue;
      }
      out.push({ id, type, jlptLevel, ...payload } as ParticleContrastCard);
    } else {
      console.warn(`[grammar] unknown card type "${type}" for id ${id}`);
    }
  }
  return out;
}
