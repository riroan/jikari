import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseGrammarCardArray } from "../lib/grammar-schema";
import type { GrammarCard } from "../lib/types";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const inputPath = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!inputPath) {
  console.error(
    "Usage: bun scripts/add-grammar.ts <path/to/grammar.json> [--dry-run]",
  );
  process.exit(1);
}

/** Separate the columnar fields from the JSON payload before inserting. */
function toRow(card: GrammarCard) {
  const { id, type, jlptLevel, ...rest } = card;
  return {
    id,
    type,
    jlpt_level: jlptLevel,
    payload: JSON.stringify(rest),
  };
}

async function main() {
  const raw = await readFile(path.resolve(inputPath), "utf-8");
  const parsedJson = JSON.parse(raw);
  const cards = parseGrammarCardArray(parsedJson);

  console.log(`parsed ${cards.length} grammar cards from ${inputPath}`);
  for (const c of cards) {
    console.log(`  • ${c.id}  [${c.type}]  N${c.jlptLevel}`);
  }

  if (dryRun) {
    console.log("\n(dry-run) schema valid — no DB writes.");
    return;
  }

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
    "SELECT id FROM grammar_cards WHERE id IN (?)",
    [ids],
  );
  const existing = new Set(existingRows.map((r) => r.id as string));

  let inserted = 0;
  const skipped: string[] = [];

  for (const card of cards) {
    if (existing.has(card.id)) {
      skipped.push(card.id);
      continue;
    }
    const row = toRow(card);
    await conn.query(
      `INSERT INTO grammar_cards (id, type, jlpt_level, payload)
       VALUES (?, ?, ?, CAST(? AS JSON))`,
      [row.id, row.type, row.jlpt_level, row.payload],
    );
    inserted++;
    console.log(`  + ${row.id} [${row.type}]`);
  }

  await conn.end();

  console.log(
    `\n✓ inserted ${inserted}, skipped ${skipped.length}${
      skipped.length ? ` (already exist: ${skipped.join(", ")})` : ""
    }`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
