import { z } from "zod";
import type { GrammarCard } from "./types";

/**
 * Zod schema for grammar_cards content. Shared between the LLM generator
 * (seed time) and the add-grammar script (import time). Both run with
 * strictObject so stray keys fail fast instead of being silently carried
 * into the DB payload.
 *
 * Eng review 2026-04-19 #5: seed pipeline validates shape here, then a
 * second LLM call reviews semantic correctness of koreanStructure.
 */

const jlptLevel = z.union([
  z.literal(5),
  z.literal(4),
  z.literal(3),
  z.literal(2),
  z.literal(1),
]);

const example = z
  .object({
    jp: z.string().min(1),
    ko: z.string().min(1),
  })
  .strict();

const patternQuiz = z
  .object({
    sentence: z.string().min(1).refine((s) => s.includes("＿＿＿"), {
      message: "sentence must contain ＿＿＿ blank",
    }),
    sentenceRuby: z.string().optional(),
    correct: z.string().min(1),
    distractors: z.array(z.string().min(1)).length(3),
    translation: z.string().min(1),
  })
  .strict();

const particleExample = z
  .object({
    particle: z.string().min(1),
    jp: z.string().min(1),
    ko: z.string().min(1),
  })
  .strict();

const particleQuiz = z
  .object({
    sentence: z.string().min(1).refine((s) => s.includes("＿＿＿"), {
      message: "sentence must contain ＿＿＿ blank",
    }),
    sentenceRuby: z.string().optional(),
    correct: z.string().min(1),
    distractors: z.array(z.string().min(1)).length(3),
    translation: z.string().min(1),
  })
  .strict();

const patternCardSchema = z
  .object({
    id: z.string().regex(/^pattern-[a-z0-9-]+$/, {
      message: "id must match /^pattern-[a-z0-9-]+$/",
    }),
    type: z.literal("pattern"),
    jlptLevel,
    pattern: z.string().min(1),
    koreanStructure: z.string().min(1),
    meaningKo: z.string().min(1),
    examples: z.array(example).length(3),
    quizzes: z.array(patternQuiz).length(3),
  })
  .strict();

const particleCardSchema = z
  .object({
    id: z.string().regex(/^particle-[a-z0-9-]+$/, {
      message: "id must match /^particle-[a-z0-9-]+$/",
    }),
    type: z.literal("particle_contrast"),
    jlptLevel,
    particles: z.tuple([z.string().min(1), z.string().min(1)]),
    rule: z.string().min(1),
    // 2 examples per particle × 2 particles = 4 total. Refine below.
    examples: z.array(particleExample).length(4),
    quizzes: z.array(particleQuiz).length(3),
  })
  .strict()
  .superRefine((card, ctx) => {
    const [p1, p2] = card.particles;
    const c1 = card.examples.filter((e) => e.particle === p1).length;
    const c2 = card.examples.filter((e) => e.particle === p2).length;
    if (c1 !== 2 || c2 !== 2) {
      ctx.addIssue({
        code: "custom",
        message: `expected exactly 2 examples for each of ${p1} and ${p2} (got ${c1}, ${c2})`,
        path: ["examples"],
      });
    }
    for (const q of card.quizzes) {
      if (q.correct !== p1 && q.correct !== p2) {
        ctx.addIssue({
          code: "custom",
          message: `quiz.correct "${q.correct}" must be one of the two particles (${p1}/${p2})`,
          path: ["quizzes"],
        });
      }
    }
  });

export const grammarCardSchema = z.discriminatedUnion("type", [
  patternCardSchema,
  particleCardSchema,
]);

export const grammarCardArraySchema = z.array(grammarCardSchema);

/** Narrowing helper — throws a friendly error if validation fails. */
export function parseGrammarCard(raw: unknown): GrammarCard {
  return grammarCardSchema.parse(raw) as GrammarCard;
}

export function parseGrammarCardArray(raw: unknown): GrammarCard[] {
  return grammarCardArraySchema.parse(raw) as GrammarCard[];
}
