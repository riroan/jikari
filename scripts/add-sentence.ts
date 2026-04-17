import { loadEnvConfig } from "@next/env";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SentenceCard } from "../lib/types";

loadEnvConfig(process.cwd());

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: bun scripts/add-sentence.ts <path/to/sentences.json>");
  process.exit(1);
}

function validate(c: unknown, idx: number): SentenceCard {
  if (!c || typeof c !== "object") throw new Error(`#${idx}: not an object`);
  const r = c as Record<string, unknown>;
  const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  const isStrArr = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  const need = (k: string, pred: (v: unknown) => boolean) => {
    if (!pred(r[k])) throw new Error(`#${idx}: invalid '${k}'`);
  };
  need("id", isStr);
  need("sentence", isStr);
  need("blank", isStr);
  need("distractors", (v) => isStrArr(v) && (v as string[]).length === 3);
  need("translation", isStr);
  need("jlptLevel", (v) => typeof v === "number" && v >= 1 && v <= 5);
  if (r.sentenceRuby !== undefined && !isStr(r.sentenceRuby)) {
    throw new Error(`#${idx}: invalid 'sentenceRuby' (must be string or omitted)`);
  }
  if (r.blankRuby !== undefined && !isStr(r.blankRuby)) {
    throw new Error(`#${idx}: invalid 'blankRuby' (must be string or omitted)`);
  }
  return r as unknown as SentenceCard;
}

async function main() {
  const raw = await readFile(path.resolve(inputPath), "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of sentence cards");
  }
  const cards: SentenceCard[] = parsed.map((c, i) => validate(c, i));

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
    "SELECT id FROM sentence_cards WHERE id IN (?)",
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
      `INSERT INTO sentence_cards
         (id, sentence, sentence_ruby, blank, blank_ruby, distractors, translation, jlpt_level)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
      [
        c.id,
        c.sentence,
        c.sentenceRuby ?? null,
        c.blank,
        c.blankRuby ?? null,
        JSON.stringify(c.distractors),
        c.translation,
        c.jlptLevel,
      ]
    );
    inserted++;
    console.log(`  + ${c.id}  (N${c.jlptLevel}, "${c.sentence}")`);
  }

  await conn.end();

  console.log(
    `\n✓ inserted ${inserted}, skipped ${skipped.length}${
      skipped.length ? ` (already exist: ${skipped.join(", ")})` : ""
    }`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
