import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExpressionCard, Register } from "../lib/types";

const REGISTERS: readonly Register[] = ["casual", "polite", "humble"];

export function validate(c: unknown, idx: number): ExpressionCard {
  if (!c || typeof c !== "object") throw new Error(`#${idx}: not an object`);
  const r = c as Record<string, unknown>;
  const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
  const need = (k: string, pred: (v: unknown) => boolean) => {
    if (!pred(r[k])) throw new Error(`#${idx}: invalid '${k}'`);
  };
  need("id", isStr);
  need("situation_ko", isStr);
  need("expression_jp", isStr);
  need("translation_ko", isStr);
  if (!isStr(r.register) || !REGISTERS.includes(r.register as Register)) {
    throw new Error(
      `#${idx}: invalid 'register' (must be one of ${REGISTERS.join(", ")})`,
    );
  }
  if (r.ruby !== undefined && !isStr(r.ruby)) {
    throw new Error(`#${idx}: invalid 'ruby' (must be string or omitted)`);
  }
  if (r.note_ko !== undefined && !isStr(r.note_ko)) {
    throw new Error(`#${idx}: invalid 'note_ko' (must be string or omitted)`);
  }
  return r as unknown as ExpressionCard;
}

async function main() {
  const { loadJikariEnv } = await import("./_env");
  loadJikariEnv();

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.error("Missing DB env vars. Check .env.local.");
    process.exit(1);
  }

  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: bun scripts/add-expression.ts <path/to/expressions.json>");
    process.exit(1);
  }

  const raw = await readFile(path.resolve(inputPath), "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array of expression cards");
  }
  const cards: ExpressionCard[] = parsed.map((c, i) => validate(c, i));

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
  });

  const ids = cards.map((c) => c.id);
  let existing = new Set<string>();
  if (ids.length > 0) {
    const [existingRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM expression_cards WHERE id IN (?)",
      [ids],
    );
    existing = new Set(existingRows.map((r) => r.id as string));
  }

  let inserted = 0;
  const skipped: string[] = [];

  for (const c of cards) {
    if (existing.has(c.id)) {
      skipped.push(c.id);
      continue;
    }
    await conn.query(
      `INSERT INTO expression_cards
         (id, situation_ko, expression_jp, ruby, register, translation_ko, note_ko)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.situation_ko,
        c.expression_jp,
        c.ruby ?? null,
        c.register,
        c.translation_ko,
        c.note_ko ?? null,
      ],
    );
    inserted++;
    console.log(`  + ${c.id}  [${c.register}] "${c.expression_jp}" → ${c.translation_ko}`);
  }

  await conn.end();

  console.log(
    `\n✓ inserted ${inserted}, skipped ${skipped.length}${
      skipped.length ? ` (already exist: ${skipped.join(", ")})` : ""
    }`,
  );
}

// Only run when invoked as a script (bun). Allows `import { validate } from ...`
// in tests without firing the DB connection.
if ((import.meta as ImportMeta & { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
