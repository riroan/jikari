/**
 * Read data/chapters.config.ts, match against current cards, write
 * `chapters` + `chapter_members` rows. Idempotent (UPSERT chapters,
 * REPLACE members per chapter).
 *
 * Fail-soft policy: invalid card refs (chapter member that doesn't exist
 * in DB) are warned, not fatal — chapters can still ship with reduced
 * denominator. Eng review locked decision.
 *
 * Usage:
 *   bun scripts/import-chapters.ts            # full sync
 *   bun scripts/import-chapters.ts --dry-run  # validate matches, no DB writes
 */
import mysql from "mysql2/promise";
import { CHAPTERS, type ChapterDef } from "../data/chapters.config";
import type { CardMode } from "../lib/types";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars. Check .env.local.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

interface CardIndex {
  vocab: Map<string, { id: string; word: string; koreanMeanings: string[] }>;
  kanji: Map<string, { id: string; kanji: string; koreanMeaning: string }>;
  /** category="vocab" sentences (verb/adjective blanks) */
  sentence: Array<{ id: string; sentence: string; translation: string }>;
  /** category="particle" sentences */
  particle: Array<{ id: string; blank: string; sentence: string }>;
  grammar: Set<string>;
}

async function loadCardIndex(conn: mysql.Connection): Promise<CardIndex> {
  const [vocabRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id, word, korean_meanings FROM vocab_cards",
  );
  const [kanjiRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id, kanji, korean_meaning FROM kanji_cards",
  );
  const [sentRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id, sentence, translation, blank, category FROM sentence_cards",
  );
  const [grammarRows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT id FROM grammar_cards",
  );

  const vocab = new Map<string, { id: string; word: string; koreanMeanings: string[] }>();
  for (const r of vocabRows) {
    let kms: string[] = [];
    try {
      kms = typeof r.korean_meanings === "string"
        ? JSON.parse(r.korean_meanings)
        : (r.korean_meanings ?? []);
    } catch {
      kms = [];
    }
    vocab.set(r.id as string, {
      id: r.id as string,
      word: r.word as string,
      koreanMeanings: kms,
    });
  }

  const kanji = new Map<string, { id: string; kanji: string; koreanMeaning: string }>();
  for (const r of kanjiRows) {
    kanji.set(r.id as string, {
      id: r.id as string,
      kanji: r.kanji as string,
      koreanMeaning: (r.korean_meaning as string) ?? "",
    });
  }

  const sentence: CardIndex["sentence"] = [];
  const particle: CardIndex["particle"] = [];
  for (const r of sentRows) {
    if (r.category === "particle") {
      particle.push({
        id: r.id as string,
        blank: r.blank as string,
        sentence: r.sentence as string,
      });
    } else {
      sentence.push({
        id: r.id as string,
        sentence: r.sentence as string,
        translation: r.translation as string,
      });
    }
  }

  const grammar = new Set<string>(grammarRows.map((r) => r.id as string));

  console.log(
    `loaded: ${vocab.size} vocab, ${kanji.size} kanji, ${sentence.length} sentence(vocab), ${particle.length} sentence(particle), ${grammar.size} grammar`,
  );

  return { vocab, kanji, sentence, particle, grammar };
}

interface MatchResult {
  members: Array<{ mode: CardMode; cardId: string }>;
  unmatched: { vocabWords: string[]; kanji: string[]; grammarIds: string[] };
}

function matchChapter(def: ChapterDef, idx: CardIndex): MatchResult {
  const members = new Map<string, { mode: CardMode; cardId: string }>();
  const add = (mode: CardMode, cardId: string) => {
    members.set(`${mode}:${cardId}`, { mode, cardId });
  };

  const m = def.match;

  // vocab: explicit word list
  const unmatchedVocab: string[] = [];
  for (const word of m.vocabWords ?? []) {
    if (idx.vocab.has(word)) {
      add("vocab", word);
    } else {
      unmatchedVocab.push(word);
    }
  }

  // vocab + sentence: keyword match against koreanMeanings / translation
  const keywords = m.keywords ?? [];
  if (keywords.length > 0) {
    for (const v of idx.vocab.values()) {
      if (v.koreanMeanings.some((km) => keywords.some((k) => km.includes(k)))) {
        add("vocab", v.id);
      }
    }
    for (const s of idx.sentence) {
      if (keywords.some((k) => s.translation.includes(k))) {
        add("sentence", s.id);
      }
    }
  }

  // kanji: explicit list
  const unmatchedKanji: string[] = [];
  for (const k of m.kanji ?? []) {
    if (idx.kanji.has(k)) {
      add("kanji", k);
    } else {
      unmatchedKanji.push(k);
    }
  }

  // sentenceIds: explicit ids
  for (const sid of m.sentenceIds ?? []) {
    if (idx.sentence.some((s) => s.id === sid)) {
      add("sentence", sid);
    }
  }

  // particles: blank match
  for (const p of idx.particle) {
    if ((m.particles ?? []).includes(p.blank)) {
      add("sentence", p.id);
    }
  }

  // grammar: explicit ids
  const unmatchedGrammar: string[] = [];
  for (const gid of m.grammarIds ?? []) {
    if (idx.grammar.has(gid)) {
      add("grammar", gid);
    } else {
      unmatchedGrammar.push(gid);
    }
  }

  return {
    members: [...members.values()],
    unmatched: {
      vocabWords: unmatchedVocab,
      kanji: unmatchedKanji,
      grammarIds: unmatchedGrammar,
    },
  };
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  const idx = await loadCardIndex(conn);

  console.log(`\nProcessing ${CHAPTERS.length} chapters…`);

  // ID collision check (config-side)
  const seenIds = new Set<string>();
  for (const def of CHAPTERS) {
    if (seenIds.has(def.id)) {
      console.error(`  ✗ duplicate chapter id in config: ${def.id}`);
      process.exit(1);
    }
    seenIds.add(def.id);
  }

  let totalMembers = 0;
  let totalWarnings = 0;
  const results: Array<{ def: ChapterDef; result: MatchResult }> = [];

  for (const def of CHAPTERS) {
    const result = matchChapter(def, idx);
    results.push({ def, result });
    totalMembers += result.members.length;
    const warnCount =
      result.unmatched.vocabWords.length +
      result.unmatched.kanji.length +
      result.unmatched.grammarIds.length;
    totalWarnings += warnCount;
    console.log(
      `  • ${def.id.padEnd(28)} ${String(result.members.length).padStart(3)} members${
        warnCount > 0 ? `  (${warnCount} unmatched refs)` : ""
      }`,
    );
    if (warnCount > 0) {
      if (result.unmatched.vocabWords.length > 0)
        console.log(`      missing vocab: ${result.unmatched.vocabWords.join(", ")}`);
      if (result.unmatched.kanji.length > 0)
        console.log(`      missing kanji: ${result.unmatched.kanji.join(", ")}`);
      if (result.unmatched.grammarIds.length > 0)
        console.log(`      missing grammar: ${result.unmatched.grammarIds.join(", ")}`);
    }
  }

  console.log(
    `\nTotal: ${totalMembers} members across ${CHAPTERS.length} chapters, ${totalWarnings} unmatched refs (fail-soft).`,
  );

  if (dryRun) {
    console.log("\n(dry-run) no DB writes.");
    await conn.end();
    return;
  }

  // Write to DB. UPSERT chapters, REPLACE all chapter_members per chapter.
  await conn.beginTransaction();
  try {
    for (const { def, result } of results) {
      // Upsert chapter
      await conn.query(
        `INSERT INTO chapters (id, name, intro, sort_order)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), intro = VALUES(intro), sort_order = VALUES(sort_order)`,
        [def.id, def.name, def.intro, def.sortOrder],
      );
      // Replace members
      await conn.query("DELETE FROM chapter_members WHERE chapter_id = ?", [def.id]);
      if (result.members.length > 0) {
        const values = result.members.map((m) => [def.id, m.mode, m.cardId]);
        await conn.query(
          "INSERT INTO chapter_members (chapter_id, mode, card_id) VALUES ?",
          [values],
        );
      }
    }
    // Drop chapters that exist in DB but aren't in config (clean removed entries)
    const configIds = CHAPTERS.map((c) => c.id);
    if (configIds.length > 0) {
      await conn.query(
        `DELETE FROM chapters WHERE id NOT IN (?)`,
        [configIds],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  }

  await conn.end();
  console.log(`\n✓ wrote ${CHAPTERS.length} chapters, ${totalMembers} members.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
