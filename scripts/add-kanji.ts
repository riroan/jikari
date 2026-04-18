import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { KanjiCard } from "../lib/types";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: bun scripts/add-kanji.ts <path/to/kanji.json>");
  process.exit(1);
}

function validate(c: unknown, idx: number): KanjiCard {
  if (!c || typeof c !== "object") throw new Error(`#${idx}: not an object`);
  const r = c as Record<string, unknown>;
  const need = (k: string, pred: (v: unknown) => boolean) => {
    if (!pred(r[k])) throw new Error(`#${idx}: invalid '${k}'`);
  };
  const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  const isStrArr = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  need("id", isStr);
  need("kanji", isStr);
  need("onReadings", isStrArr);
  need("kunReadings", isStrArr);
  need("meanings", isStrArr);
  need("jlptLevel", (v) => typeof v === "number" && v >= 1 && v <= 5);
  need("koreanHanja", isStr);
  need("koreanSound", isStrArr);
  need("koreanMeaning", isStr);
  return r as unknown as KanjiCard;
}

async function main() {
  const raw = await readFile(path.resolve(inputPath), "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of kanji cards");
  }
  const cards: KanjiCard[] = parsed.map((c, i) => validate(c, i));

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });

  const ids = cards.map((c) => c.id);
  const [existingRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id FROM kanji_cards WHERE id IN (?)",
    [ids]
  );
  const existing = new Set(existingRows.map((r) => r.id as string));

  let inserted = 0;
  const skipped: string[] = [];

  for (const c of cards) {
    if (existing.has(c.id)) {
      skipped.push(c.id);
      continue;
    }
    await conn.query(
      `INSERT INTO kanji_cards
         (id, kanji, on_readings, kun_readings, meanings, jlpt_level, korean_hanja, korean_sound, korean_meaning)
       VALUES (?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON), ?, ?, CAST(? AS JSON), ?)`,
      [
        c.id,
        c.kanji,
        JSON.stringify(c.onReadings),
        JSON.stringify(c.kunReadings),
        JSON.stringify(c.meanings),
        c.jlptLevel,
        c.koreanHanja,
        JSON.stringify(c.koreanSound),
        c.koreanMeaning,
      ]
    );
    inserted++;
    console.log(`  + ${c.id}  (N${c.jlptLevel}, ${c.koreanMeaning})`);
  }

  await conn.end();

  console.log(`\n✓ inserted ${inserted}, skipped ${skipped.length}${skipped.length ? ` (already exist: ${skipped.join(", ")})` : ""}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
