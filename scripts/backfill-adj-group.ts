import mysql from "mysql2/promise";
import { loadJikariEnv } from "./_env";
import type { AdjGroup } from "../lib/types";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

/**
 * Na-adjectives — explicit list. There's no reliable orthographic marker
 * (na-adj dict form is bare noun-like), so we enumerate known cases.
 * Extend as new vocab is added.
 */
const KNOWN_NA_ADJ = new Set<string>([
  "好き",
  "嫌い",
  "元気",
  "静か",
  "簡単",
  "便利",
  "有名",
  "大切",
  "大変",
  "上手",
  "下手",
  "きれい",
  "親切",
  "自由",
  "暇",
  "ハンサム",
  "にぎやか",
  "いろいろ",
  "同じ",
  "立派",
  "丈夫",
  "真面目",
]);

/**
 * Words that look like i-adj (end in い) but are nouns.
 * Force not_adj to keep them out of the pool.
 */
const I_ADJ_BLOCKLIST = new Set<string>([
  "昨日", // reading きのう ends in う — won't match anyway, listed for safety
]);

function classify(
  word: string,
  reading: string,
  koreanMeanings: string[],
  verbGroup: string | null,
): AdjGroup {
  // Explicit na-adj override runs FIRST. Otherwise na-adjs whose readings end
  // in verb-like tails (大切/たいせつ, 自由/じゆう, 親切/しんせつ…) get
  // misclassified as godan by the sibling verb-group backfill, and then land
  // here with verbGroup='godan' — which would short-circuit them to 'not_adj'
  // before we ever consult KNOWN_NA_ADJ. Checking the set first makes the
  // adj-side authoritative for listed na-adjs.
  if (KNOWN_NA_ADJ.has(word)) return "na_adj";

  // Already a verb → not an adjective.
  if (
    verbGroup === "godan" ||
    verbGroup === "ichidan" ||
    verbGroup === "irregular"
  ) {
    return "not_adj";
  }

  // Blocked words.
  if (I_ADJ_BLOCKLIST.has(word)) return "not_adj";

  // i-adj heuristic: word ends in い AND reading ends in い AND at least
  // one Korean meaning ends in 다 (adjective/verb marker).
  //    - "い" ending alone catches some nouns (姪, 甥). Reading check helps.
  //    - 다 ending catches both Korean verbs and Korean adjectives — combined
  //      with "ends in い" in Japanese, the verb case is already excluded by
  //      the verb_group check above.
  if (
    word.endsWith("い") &&
    reading.endsWith("い") &&
    koreanMeanings.some((m) => m.trim().endsWith("다"))
  ) {
    return "i_adj";
  }

  return "not_adj";
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id, word, reading, korean_meanings, verb_group, adj_group FROM vocab_cards ORDER BY id"
  );

  const counts: Record<AdjGroup | "unchanged", number> = {
    i_adj: 0,
    na_adj: 0,
    not_adj: 0,
    unchanged: 0,
  };

  const updates: Array<{
    id: string;
    word: string;
    reading: string;
    prev: string | null;
    next: AdjGroup;
  }> = [];

  for (const r of rows) {
    const id = r.id as string;
    const word = r.word as string;
    const reading = r.reading as string;
    const rawKM = r.korean_meanings;
    const koreanMeanings: string[] = Array.isArray(rawKM)
      ? (rawKM as string[])
      : typeof rawKM === "string"
        ? (JSON.parse(rawKM) as string[])
        : [];
    const verbGroup = (r.verb_group as string | null) ?? null;
    const prev = (r.adj_group as string | null) ?? null;
    const next = classify(word, reading, koreanMeanings, verbGroup);

    if (prev === next) {
      counts.unchanged++;
      continue;
    }

    counts[next]++;
    updates.push({ id, word, reading, prev, next });
  }

  const adjTypes: AdjGroup[] = ["i_adj", "na_adj", "not_adj"];
  for (const t of adjTypes) {
    console.log(`\n=== ${t} (${counts[t]}) ===`);
    for (const u of updates) {
      if (u.next === t) {
        const prevStr = u.prev ? `  [prev: ${u.prev}]` : "";
        console.log(`  ${u.word}  (${u.reading})${prevStr}`);
      }
    }
  }

  console.log(
    `\nTotal: ${rows.length} cards, ${updates.length} to update, ${counts.unchanged} unchanged.`
  );

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to commit.`);
    await conn.end();
    return;
  }

  for (const u of updates) {
    await conn.query("UPDATE vocab_cards SET adj_group = ? WHERE id = ?", [
      u.next,
      u.id,
    ]);
  }
  console.log(`\n✓ Applied ${updates.length} updates.`);
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
