import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { VocabCard } from "../lib/types";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: bun scripts/add-vocab.ts <path/to/vocab.json>");
  process.exit(1);
}

const VALID_VERB_GROUPS = new Set([
  "godan",
  "ichidan",
  "irregular",
  "not_verb",
]);

const VALID_ADJ_GROUPS = new Set(["i_adj", "na_adj", "not_adj"]);

function validate(c: unknown, idx: number): VocabCard {
  if (!c || typeof c !== "object") throw new Error(`#${idx}: not an object`);
  const r = c as Record<string, unknown>;
  const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  const isStrArr = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === "string");
  const need = (k: string, pred: (v: unknown) => boolean) => {
    if (!pred(r[k])) throw new Error(`#${idx}: invalid '${k}'`);
  };
  need("id", isStr);
  need("word", isStr);
  need("reading", isStr);
  need("meanings", isStrArr);
  need("koreanMeanings", isStrArr);
  need("jlptLevel", (v) => typeof v === "number" && v >= 1 && v <= 5);
  if (r.ruby !== undefined && !isStr(r.ruby)) {
    throw new Error(`#${idx}: invalid 'ruby' (must be string or omitted)`);
  }
  // verbGroup is required for new cards — removes continuous-backfill burden.
  if (!isStr(r.verbGroup) || !VALID_VERB_GROUPS.has(r.verbGroup)) {
    throw new Error(
      `#${idx}: invalid 'verbGroup' (must be one of godan/ichidan/irregular/not_verb)`,
    );
  }
  // adjGroup is required for new cards — same reason.
  if (!isStr(r.adjGroup) || !VALID_ADJ_GROUPS.has(r.adjGroup)) {
    throw new Error(
      `#${idx}: invalid 'adjGroup' (must be one of i_adj/na_adj/not_adj)`,
    );
  }
  return r as unknown as VocabCard;
}

async function main() {
  const raw = await readFile(path.resolve(inputPath), "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of vocab cards");
  }
  const cards: VocabCard[] = parsed.map((c, i) => validate(c, i));

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
    "SELECT id FROM vocab_cards WHERE id IN (?)",
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
      `INSERT INTO vocab_cards
         (id, word, reading, meanings, korean_meanings, ruby, jlpt_level, verb_group, adj_group)
       VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?)`,
      [
        c.id,
        c.word,
        c.reading,
        JSON.stringify(c.meanings),
        JSON.stringify(c.koreanMeanings),
        c.ruby ?? null,
        c.jlptLevel,
        c.verbGroup ?? "not_verb",
        c.adjGroup ?? "not_adj",
      ]
    );
    inserted++;
    const tags = [c.verbGroup, c.adjGroup].filter(
      (t) => t && t !== "not_verb" && t !== "not_adj"
    );
    console.log(
      `  + ${c.id}  (N${c.jlptLevel}${tags.length ? `, ${tags.join(", ")}` : ""}, ${c.koreanMeanings.join(", ")})`
    );
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
