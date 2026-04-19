import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type {
  HeatmapData,
  LearningState,
  PersistedState,
} from "../types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "../types";

export async function getProgress(): Promise<PersistedState> {
  const pool = getPool();

  const [lsRows] = await pool.query<RowDataPacket[]>(
    "SELECT card_key, mode, card_id, box, next_due, correct_streak, last_reviewed FROM learning_states"
  );
  const learningStates: Record<string, LearningState> = {};
  for (const r of lsRows) {
    const state: LearningState = {
      cardKey: r.card_key as string,
      mode: r.mode as LearningState["mode"],
      cardId: r.card_id as string,
      box: r.box as LearningState["box"],
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
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  const rawThreshold = Number(st.typing_threshold_box);
  const typingThresholdBox: 2 | 3 | 4 | 5 =
    rawThreshold === 2 || rawThreshold === 3 || rawThreshold === 5
      ? rawThreshold
      : 4;

  return {
    schemaVersion: Number(st.schema_version),
    learningStates,
    heatmap,
    lastActiveAt: Number(st.last_active_at),
    currentStreak: Number(st.current_streak),
    settings: {
      theme: st.theme as "light" | "dark",
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
