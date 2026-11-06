import "server-only";
import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection } from "mysql2/promise";
import { progressTag, sameTag } from "../progress-tag";
import { mergeState } from "../merge-state";
import { getPool } from "./client";
import { normalizeDailyGoal } from "../daily-goal";
import { normalizeProgression, type Progression } from "../progression";
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

/** Remote DB may not have migration 0013 (app_settings.daily_goal) yet: degrade instead of 500-ing the whole app. */
let noDailyGoal = false;
function isMissingDailyGoal(e: unknown): boolean {
  const err = e as { errno?: number; message?: string };
  return err?.errno === 1054 || /Unknown column/i.test(err?.message ?? "");
}
function markNoDailyGoal() {
  if (!noDailyGoal) console.warn("[db] app_settings.daily_goal missing — run migration 0013; using the default daily goal until then");
  noDailyGoal = true;
}

/** Same degrade for migration 0014 (progression table): no table → progression is simply absent. */
let noProgression = false;
function isMissingTable(e: unknown): boolean {
  const err = e as { errno?: number; message?: string };
  return err?.errno === 1146 || /doesn't exist/i.test(err?.message ?? "");
}
function markNoProgression() {
  if (!noProgression) console.warn("[db] progression table missing — run migration 0014; points are not saved until then");
  noProgression = true;
}

async function readProgression(pool: Pick<Pool | PoolConnection, "query">): Promise<Progression | undefined> {
  if (noProgression) return undefined;
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT data FROM progression WHERE id = 1");
    const raw = rows?.[0]?.data;
    if (raw == null) return undefined;
    return normalizeProgression(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch (e) {
    if (!isMissingTable(e)) throw e;
    markNoProgression();
    return undefined;
  }
}

export async function getProgress(pool: Pick<Pool | PoolConnection, "query"> = getPool()): Promise<PersistedState> {

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

  const settingsSql = (withGoal: boolean) =>
    `SELECT theme, show_furigana, typing_threshold_box, ${withGoal ? "daily_goal, " : ""}last_active_at, current_streak, schema_version FROM app_settings WHERE id = 1`;
  let stRows: RowDataPacket[];
  try {
    [stRows] = await pool.query<RowDataPacket[]>(settingsSql(!noDailyGoal));
  } catch (e) {
    if (noDailyGoal || !isMissingDailyGoal(e)) throw e;
    markNoDailyGoal();
    [stRows] = await pool.query<RowDataPacket[]>(settingsSql(false));
  }
  const st = stRows[0];
  const progression = await readProgression(pool);
  const prog = progression ? { progression } : {};

  if (!st) {
    return {
      schemaVersion: SCHEMA_VERSION,
      learningStates,
      heatmap,
      lastActiveAt: 0,
      currentStreak: 0,
      quizStats,
      ratings,
      ...prog,
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  const rawThreshold = Number(st.typing_threshold_box);
  const typingThresholdBox: 0 | 2 | 3 | 4 | 5 =
    rawThreshold === 0 || rawThreshold === 2 || rawThreshold === 3 || rawThreshold === 5
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
    ...prog,
    settings: {
      theme,
      showFurigana: Boolean(st.show_furigana),
      typingThresholdBox,
      dailyGoal: normalizeDailyGoal(st.daily_goal),
    },
  };
}

/** One consistent snapshot (a plain getProgress runs 5 separate queries and could straddle a PUT). */
export async function getProgressSnapshot(): Promise<PersistedState> {
  const conn = await getPool().getConnection();
  try {
    await conn.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
    const state = await getProgress(conn);
    await conn.commit();
    return state;
  } finally {
    conn.release();
  }
}

/** Test-only. */
export function __resetDailyGoalFlagForTests() {
  noDailyGoal = false;
  noProgression = false;
}

export type PutResult =
  | { ok: true; tag: string; merged?: PersistedState }
  | { ok: false; current: PersistedState; tag: string };

const LOCK = "jikari:progress-put";

/**
 * Replace the whole state. With `ifMatch`, only if it equals the CURRENT version tag
 * (checked under a named DB lock so concurrent PUTs serialize); otherwise nothing is written
 * and the current state is returned. No `ifMatch` and not `replace` (old clients) -> merged into the current state; `replace` -> unconditional.
 */
export async function putProgress(
  incoming: PersistedState,
  ifMatch?: string | null,
  replace = false,
): Promise<PutResult> {
  let state = incoming;
  let merged: PersistedState | undefined;
  const conn = await getPool().getConnection();
  let locked = false;
  try {
    const [lr] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK(?, 10) AS l", [LOCK]);
    if (Number(lr[0]?.l) !== 1) throw new Error("progress lock timeout");
    locked = true;
    await conn.beginTransaction();
    if (ifMatch) {
      const current = await getProgress(conn);
      const tag = progressTag(current);
      if (!sameTag(ifMatch, tag)) {
        await conn.rollback();
        return { ok: false, current, tag };
      }
    } else if (!replace) {
      // No If-Match (old client / unknown tag) and not an explicit replace: never erase what another
      // device saved. Merge into the current server state and write that.
      state = merged = mergeState(await getProgress(conn), incoming);
    }

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

    // 없으면(옛 클라이언트) 서버 값을 그대로 둔다 — 지우지 않는다.
    if (state.progression && !noProgression) {
      try {
        await conn.query(
          "INSERT INTO progression (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
          [JSON.stringify(state.progression)],
        );
      } catch (e) {
        if (!isMissingTable(e)) throw e;
        markNoProgression();
      }
    }

    const upsertSettings = (withGoal: boolean) =>
      conn.query(
        `INSERT INTO app_settings (id, theme, show_furigana, typing_threshold_box, ${withGoal ? "daily_goal, " : ""}last_active_at, current_streak, schema_version)
         VALUES (1, ?, ?, ?, ${withGoal ? "?, " : ""}?, ?, ?)
         ON DUPLICATE KEY UPDATE
           theme = VALUES(theme),
           show_furigana = VALUES(show_furigana),
           typing_threshold_box = VALUES(typing_threshold_box),
           ${withGoal ? "daily_goal = VALUES(daily_goal)," : ""}
           last_active_at = VALUES(last_active_at),
           current_streak = VALUES(current_streak),
           schema_version = VALUES(schema_version)`,
        [
          state.settings.theme,
          state.settings.showFurigana,
          state.settings.typingThresholdBox,
          ...(withGoal ? [state.settings.dailyGoal] : []),
          state.lastActiveAt,
          state.currentStreak,
          state.schemaVersion,
        ]
      );
    try {
      await upsertSettings(!noDailyGoal);
    } catch (e) {
      if (noDailyGoal || !isMissingDailyGoal(e)) throw e;
      markNoDailyGoal();
      await upsertSettings(false);
    }

    const tag = progressTag(await getProgress(conn));
    await conn.commit();
    return { ok: true, tag, ...(merged ? { merged } : {}) };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    if (locked) await conn.query("SELECT RELEASE_LOCK(?)", [LOCK]).catch(() => {});
    conn.release();
  }
}
