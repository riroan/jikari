-- Grammar mode (문법) — pattern cards + particle contrast cards.
-- Design: ~/.gstack/projects/jikari/riroan-main-design-20260418-235448.md
-- Eng review 2026-04-19: use dedicated table, not sentence_cards extension.

CREATE TABLE grammar_cards (
  id          VARCHAR(64)                                    PRIMARY KEY,
  type        ENUM('pattern', 'particle_contrast')           NOT NULL,
  jlpt_level  TINYINT                                        NOT NULL,
  -- Full card content as JSON. Shape depends on `type`:
  --   pattern           → { pattern, koreanStructure, meaningKo, examples[3], quizzes[3] }
  --   particle_contrast → { particles[2], rule, examples[4], quizzes[3] }
  -- Validated at seed time via Zod (see scripts/generate-grammar.ts).
  payload     JSON                                           NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP         NOT NULL,
  INDEX idx_type_level (type, jlpt_level)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
