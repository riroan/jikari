import mysql from "mysql2/promise";
import { loadJikariEnv } from "./_env";
import type { VerbGroup } from "../lib/types";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

/**
 * Godan verbs whose reading ends in える/いる — i.e. they LOOK ichidan but aren't.
 * Common N5-N4 class. Checked by exact reading match (hiragana).
 *
 * Source: commonly-referenced lists of exceptional godan verbs. Extend as needed.
 */
const GODAN_LOOKALIKE_READINGS = new Set<string>([
  "しる", // 知る
  "きる", // 切る (also 着る is ichidan — word form disambiguates)
  "はしる", // 走る
  "かえる", // 帰る (かえる as 変える is ichidan — word form disambiguates)
  "はいる", // 入る
  "いる", // 要る (いる as 居る is ichidan — word form disambiguates)
  "すべる", // 滑る
  "しゃべる", // 喋る
  "へる", // 減る
  "にぎる", // 握る
  "かぎる", // 限る
  "あせる", // 焦る
  "まじる", // 混じる
  "ける", // 蹴る
  "いじる", // 弄る
  "くじる",
  "ひねる",
  "しめる", // 湿る (but also ichidan 閉める — disambiguate by word)
]);

/**
 * Word-form overrides for edge cases the heuristic gets wrong.
 * - Homophones disambiguated by word (着る ichidan vs 切る godan).
 * - Non-verb interjections/expressions with verb-looking Korean meanings
 *   (ありがとう = 고맙다, but Japanese form is an interjection).
 * - Na-adjectives with readings that end in verb-like tails
 *   (大切/たいせつ, 自由/じゆう, 親切/しんせつ, 下手/へた — these trip
 *   the reading-tail heuristic and get misclassified as godan without this).
 */
const WORD_OVERRIDE: Record<string, VerbGroup> = {
  "着る": "ichidan",
  "居る": "ichidan",
  "変える": "ichidan",
  "閉める": "ichidan",
  // Non-verb forms (force not_verb despite verb-looking signals):
  "ありがとう": "not_verb",
  "さようなら": "not_verb",
  "こんにちは": "not_verb",
  "こんばんは": "not_verb",
  "おはよう": "not_verb",
  // Na-adjectives whose readings end in verb tails (う/く/ぐ/す/つ…):
  "大切": "not_verb",
  "自由": "not_verb",
  "親切": "not_verb",
  "下手": "not_verb",
  "上手": "not_verb",
  "有名": "not_verb",
};

function classify(
  word: string,
  reading: string,
  koreanMeanings: string[],
): VerbGroup {
  // Word-form exact match wins.
  if (WORD_OVERRIDE[word]) return WORD_OVERRIDE[word];

  // Korean-meaning signal: Japanese verbs map to Korean verbs (end in 다).
  // If no Korean meaning ends in 다, treat as not_verb. Filters out nouns
  // whose Japanese reading happens to end in a verb-looking tail (今日きょう,
  // 学校がっこう, 銀行ぎんこう).
  const hasKoreanVerbShape = koreanMeanings.some((m) => m.trim().endsWith("다"));
  if (!hasKoreanVerbShape) return "not_verb";

  // Irregular suru (bare + suffix compounds)
  if (reading === "する" || reading.endsWith("する")) {
    return "irregular";
  }
  // Irregular kuru — restrict to (a) bare reading くる, or (b) word contains 来.
  // NEVER match reading.endsWith("くる") alone: 作る(つくる), 送る(おくる) are godan.
  if (reading === "くる") return "irregular";
  if (word === "来る" || word.endsWith("来る")) return "irregular";

  // Not a verb if reading doesn't end in the う-row.
  const tail = reading.slice(-1);
  if (!"うくぐすつぬぶむる".includes(tail)) {
    return "not_verb";
  }

  // Only る-ending verbs split godan/ichidan.
  if (tail !== "る") return "godan";

  // Godan-lookalike exceptions (reading-based)
  if (GODAN_LOOKALIKE_READINGS.has(reading)) return "godan";

  // Ichidan signature: char before る is an え-row or い-row vowel.
  const penult = reading.slice(-2, -1);
  const ICHIDAN_PENULTS =
    "いえきけぎげしせじぜちてぢでにねひへびべぴぺみめりれ";
  if (ICHIDAN_PENULTS.includes(penult)) return "ichidan";

  // Default godan for other る-endings (乗る, 分かる, 終わる).
  return "godan";
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
    "SELECT id, word, reading, korean_meanings, verb_group FROM vocab_cards ORDER BY id"
  );

  const counts: Record<VerbGroup | "unchanged", number> = {
    godan: 0,
    ichidan: 0,
    irregular: 0,
    not_verb: 0,
    unchanged: 0,
  };

  const updates: Array<{
    id: string;
    word: string;
    reading: string;
    prev: string | null;
    next: VerbGroup;
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
    const prev = (r.verb_group as string | null) ?? null;
    const next = classify(word, reading, koreanMeanings);

    if (prev === next) {
      counts.unchanged++;
      continue;
    }

    counts[next]++;
    updates.push({ id, word, reading, prev, next });
  }

  const verbTypes: VerbGroup[] = ["godan", "ichidan", "irregular", "not_verb"];
  for (const t of verbTypes) {
    console.log(`\n=== ${t} (${counts[t]}) ===`);
    for (const u of updates) {
      if (u.next === t) {
        const prevStr = u.prev ? `  [prev: ${u.prev}]` : "";
        console.log(`  ${u.word}  (${u.reading})${prevStr}`);
      }
    }
  }

  console.log(`\nTotal: ${rows.length} cards, ${updates.length} to update, ${counts.unchanged} unchanged.`);

  if (!APPLY) {
    console.log(`\nDry run. Re-run with --apply to commit.`);
    await conn.end();
    return;
  }

  for (const u of updates) {
    await conn.query("UPDATE vocab_cards SET verb_group = ? WHERE id = ?", [
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
