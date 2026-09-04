import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type {
  CardMode,
  HeatmapData,
  LearningState,
  PersistedState,
  QuizStat,
} from "../types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../types";

const VALID_MODES: ReadonlySet<CardMode> = new Set([
  "kanji",
  "vocab",
  "sentence",
  "conjugation",
  "adjective",
  "grammar",
  "expression",
]);

function coerceMode(raw: unknown): CardMode | null {
  if (typeof raw !== "string") return null;
  return (VALID_MODES as Set<string>).has(raw) ? (raw as CardMode) : null;
}

function coerceBox(raw: unknown): 1 | 2 | 3 | 4 | 5 | null {
  const n = Number(raw);
  return n >= 1 && n <= 5 && Number.isInteger(n)
    ? (n as 1 | 2 | 3 | 4 | 5)
    : null;
}

export async function getProgress(): Promise<PersistedState> {
  const pool = getPool();

  const [lsRows] = await pool.query<RowDataPacket[]>(
    "SELECT card_key, mode, card_id, box, next_due, correct_streak, last_reviewed FROM learning_states"
  );
  const learningStates: Record<string, LearningState> = {};
  for (const r of lsRows) {
    const mode = coerceMode(r.mode);
    const box = coerceBox(r.box);
    // Skip rows with malformed enums rather than blindly typing them — the
    // PUT side validates via Zod, but the DB might still hold drift from
    // older versions. Better to lose a row than to type-launder garbage.
    if (mode === null || box === null) continue;
    const state: LearningState = {
      cardKey: r.card_key as string,
      mode,
      cardId: r.card_id as string,
      box,
      nextDue: Number(r.next_due),
      correctStreak: Number(r.correct_streak),
      lastReviewed: Number(r.last_reviewed),
    };
    learningStates[state.cardKey] = state;
  }

  const [hmRows] = await pool.query<RowDataPacket[]>(
    "SELECT day, count FROM heatmap_days"
  );
  const heatmap: HeatmapData = {};
  for (const r of hmRows) heatmap[r.day as string] = Number(r.count);

  const [qsRows] = await pool.query<RowDataPacket[]>(
    "SELECT stat_key, correct_count, wrong_count FROM quiz_stats"
  );
  const quizStats: Record<string, QuizStat> = {};
  for (const r of qsRows) {
    quizStats[r.stat_key as string] = {
      correct: Number(r.correct_count),
      wrong: Number(r.wrong_count),
    };
  }

  const [rtRows] = await pool.query<RowDataPacket[]>(
    "SELECT mode, rating FROM ratings"
  );
  const ratings: Record<string, number> = {};
  for (const r of rtRows) {
    const mode = coerceMode(r.mode);
    // Same reasoning as learning_states: drop drifted enums rather than
    // type-launder them into PersistedState.
    if (mode === null) continue;
    ratings[mode] = Number(r.rating);
  }

  const [stRows] = await pool.query<RowDataPacket[]>(
    "SELECT theme, show_furigana, typing_threshold_box, last_active_at, current_streak, schema_version FROM app_settings WHERE id = 1"
  );
  const st = stRows[0];

  if (!st) {
    return {
      schemaVersion: SCHEMA_VERSION,
      learningStates,
      heatmap,
      lastActiveAt: 0,
      currentStreak: 0,
      quizStats,
      ratings,
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  const rawThreshold = Number(st.typing_threshold_box);
  const typingThresholdBox: 2 | 3 | 4 | 5 =
    rawThreshold === 2 || rawThreshold === 3 || rawThreshold === 5
      ? rawThreshold
      : 4;

  // Validate theme — old rows may carry just "light"/"dark"; new ones can
  // also carry "system". Anything else falls back to "system" so a stray
  // value never makes it into the typed PersistedState.
  const rawTheme = String(st.theme ?? "");
  const theme: "light" | "dark" | "system" =
    rawTheme === "light" || rawTheme === "dark" || rawTheme === "system"
      ? rawTheme
      : "system";

  return {
    schemaVersion: Number(st.schema_version),
    learningStates,
    heatmap,
    lastActiveAt: Number(st.last_active_at),
    currentStreak: Number(st.current_streak),
    quizStats,
    ratings,
    settings: {
      theme,
      showFurigana: Boolean(st.show_furigana),
      typingThresholdBox,
    },
  };
}

export async function putProgress(state: PersistedState): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("DELETE FROM learning_states");
    const learningList = Object.values(state.learningStates);
    if (learningList.length > 0) {
      const rows = learningList.map((s) => [
        s.cardKey,
        s.mode,
        s.cardId,
        s.box,
        s.nextDue,
        s.correctStreak,
        s.lastReviewed,
      ]);
      await conn.query(
        "INSERT INTO learning_states (card_key, mode, card_id, box, next_due, correct_streak, last_reviewed) VALUES ?",
        [rows]
      );
    }

    await conn.query("DELETE FROM heatmap_days");
    const heatmapList = Object.entries(state.heatmap);
    if (heatmapList.length > 0) {
      const rows = heatmapList.map(([day, count]) => [day, count]);
      await conn.query("INSERT INTO heatmap_days (day, count) VALUES ?", [rows]);
    }

    await conn.query("DELETE FROM quiz_stats");
    const quizStatsList = Object.entries(state.quizStats);
    if (quizStatsList.length > 0) {
      const rows = quizStatsList.map(([key, stat]) => [
        key,
        stat.correct,
        stat.wrong,
      ]);
      await conn.query(
        "INSERT INTO quiz_stats (stat_key, correct_count, wrong_count) VALUES ?",
        [rows]
      );
    }

    await conn.query("DELETE FROM ratings");
    const ratingList = Object.entries(state.ratings);
    if (ratingList.length > 0) {
      const rows = ratingList.map(([mode, rating]) => [mode, rating]);
      await conn.query("INSERT INTO ratings (mode, rating) VALUES ?", [rows]);
    }

    await conn.query(
      `INSERT INTO app_settings (id, theme, show_furigana, typing_threshold_box, last_active_at, current_streak, schema_version)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         theme = VALUES(theme),
         show_furigana = VALUES(show_furigana),
         typing_threshold_box = VALUES(typing_threshold_box),
         last_active_at = VALUES(last_active_at),
         current_streak = VALUES(current_streak),
         schema_version = VALUES(schema_version)`,
      [
        state.settings.theme,
        state.settings.showFurigana,
        state.settings.typingThresholdBox,
        state.lastActiveAt,
        state.currentStreak,
        state.schemaVersion,
      ]
    );

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
