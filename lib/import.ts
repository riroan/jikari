import { z } from "zod";
import type { PersistedState } from "./types";
import { SCHEMA_VERSION } from "./types";
import { parseExtras, type BackupExtras } from "./extras";

/**
 * Zod schema for validating imported JSON backups.
 * Catches: malformed JSON, schema drift, malicious input.
 */

const learningStateSchema = z.object({
  cardKey: z.string(),
  mode: z.enum([
    "kanji",
    "vocab",
    "sentence",
    "conjugation",
    "adjective",
    "grammar",
    "expression",
  ]),
  cardId: z.string(),
  box: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  nextDue: z.number().int().nonnegative(),
  correctStreak: z.number().int().nonnegative(),
  lastReviewed: z.number().int().nonnegative(),
});

const quizStatSchema = z.object({
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
});

const persistedStateSchema = z.object({
  schemaVersion: z.number().int().positive(),
  learningStates: z.record(z.string(), learningStateSchema),
  heatmap: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().int().nonnegative()),
  lastActiveAt: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  // Older (v<5) backups don't carry quizStats — pad with empty object so they still import.
  quizStats: z.record(z.string(), quizStatSchema).default({}),
  // Older (v<6) backups don't carry ratings — pad so they still import.
  ratings: z.record(z.string(), z.number().finite()).default({}),
  settings: z.object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    showFurigana: z.boolean().default(true),
    typingThresholdBox: z
      .union([z.literal(0), z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .default(4),
    dailyGoal: z
      .union([z.literal(10), z.literal(20), z.literal(30), z.literal(50), z.literal(100)])
      .default(20),
  }),
});

export { persistedStateSchema };

export type ImportResult =
  | { ok: true; state: PersistedState; extras?: BackupExtras }
  | { ok: false; error: string; message: string; details?: unknown };

/**
 * Parse + validate a JSON string into a PersistedState.
 * Returns a discriminated union so callers can handle errors cleanly.
 */
export function parseBackup(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      error: "JSON parse failed",
      message: "JSON 형식이 아닙니다. jikari에서 내보낸 백업 파일인지 확인하세요.",
      details: String(e),
    };
  }

  const result = persistedStateSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "Schema validation failed",
      message: "백업 파일의 형식이 올바르지 않습니다. 파일이 손상되었거나 jikari 백업이 아닙니다.",
      details: result.error.issues,
    };
  }

  // Future schema migration would go here
  if (result.data.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Backup schema v${result.data.schemaVersion} is newer than app v${SCHEMA_VERSION}`,
      message: "이 백업은 더 새로운 버전의 jikari에서 만들어졌습니다. 앱을 업데이트한 뒤 다시 시도하세요.",
    };
  }

  return { ok: true, state: result.data, extras: parseExtras((parsed as { extras?: unknown }).extras) };
}

// Zod 없는 모듈로 옮겼다 — 설정 화면이 미리보기 때문에 Zod 전체(≈290KB)를 정적으로
// 끌어오지 않게. 기존 import 경로는 그대로 쓸 수 있다.
export { summarizeBackup } from "./backup-summary";
