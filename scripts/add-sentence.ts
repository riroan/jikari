import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SentenceCard } from "../lib/types";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

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
  if (r.category === undefined) {
    r.category = "vocab";
  } else if (r.category !== "vocab" && r.category !== "particle") {
    throw new Error(`#${idx}: invalid 'category' (must be 'vocab' or 'particle')`);
  }
  return r as unknown as SentenceCard;
}

type Pos = "v" | "adj" | "n";

/**
 * 선지 품사 버킷. 동사 사전형이 「〜です」 앞 형용사 자리에 섞이면 뜻을 몰라도
 * 형태만 보고 지워진다 — 그런 선지는 3지선다가 아니라 1지선다다.
 *
 * 백필된 vocab_cards 컬럼을 먼저 쓴다. 어미 규칙만으로는 嫌い(な형용사)가
 * い형용사로, 好き가 명사로 잡힌다.
 */
function posOf(word: string, known: Map<string, Pos>): Pos {
  const fromDb = known.get(word);
  if (fromDb) return fromDb;
  if (/い$/.test(word)) return "adj";
  if (/[うくぐすつぬぶむる]$/.test(word)) return "v";
  return "n";
}

async function loadVocabPos(conn: mysql.Connection): Promise<Map<string, Pos>> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT word, verb_group, adj_group FROM vocab_cards"
  );
  const m = new Map<string, Pos>();
  for (const r of rows) {
    const pos: Pos =
      r.verb_group && r.verb_group !== "not_verb"
        ? "v"
        : r.adj_group && r.adj_group !== "not_adj"
          ? "adj"
          : "n";
    m.set(r.word as string, pos);
  }
  return m;
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

  const vocabPos = await loadVocabPos(conn);
  for (const c of cards) {
    const want = posOf(c.blank, vocabPos);
    const off = c.distractors.filter((d) => posOf(d, vocabPos) !== want);
    if (off.length) {
      await conn.end();
      throw new Error(
        `${c.id}: 선지 품사 불일치 — 정답 '${c.blank}'(${want}) vs ${off
          .map((d) => `'${d}'(${posOf(d, vocabPos)})`)
          .join(", ")}`
      );
    }
  }

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
         (id, category, sentence, sentence_ruby, blank, blank_ruby, distractors, translation, jlpt_level)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
      [
        c.id,
        c.category,
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
    console.log(`  + ${c.id}  [${c.category}] (N${c.jlptLevel}, "${c.sentence}")`);
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
