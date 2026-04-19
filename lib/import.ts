import { z } from "zod";
import type { PersistedState } from "./types";
import { SCHEMA_VERSION } from "./types";

/**
 * Zod schema for validating imported JSON backups.
 * Catches: malformed JSON, schema drift, malicious input.
 */

const learningStateSchema = z.object({
  cardKey: z.string(),
  // 'conjugation' accepted for future activation of the conjugation quiz mode.
  mode: z.enum(["kanji", "vocab", "sentence", "conjugation"]),
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
  settings: z.object({
    theme: z.enum(["light", "dark"]),
    showFurigana: z.boolean().default(true),
    typingThresholdBox: z
      .union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
      .default(4),
  }),
});

export type ImportResult =
  | { ok: true; state: PersistedState }
  | { ok: false; error: string; details?: unknown };

/**
 * Parse + validate a JSON string into a PersistedState.
 * Returns a discriminated union so callers can handle errors cleanly.
 */
export function parseBackup(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: "JSON parse failed", details: String(e) };
  }

  const result = persistedStateSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: "Schema validation failed",
      details: result.error.issues,
    };
  }

  // Future schema migration would go here
  if (result.data.schemaVersion > SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Backup schema v${result.data.schemaVersion} is newer than app v${SCHEMA_VERSION}`,
    };
  }

  return { ok: true, state: result.data };
}
