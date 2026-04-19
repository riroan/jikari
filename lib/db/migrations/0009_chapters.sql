-- 0009_chapters: 단원(챕터) — groups existing cards for unit-level mastery signal.
-- Design: ~/.gstack/projects/jikari/riroan-main-design-20260419-214009.md
-- Eng review locked: separate `chapters` + `chapter_members` polymorphic tables;
-- no SQL FK across content tables (5 modes), validation lives in import script.

CREATE TABLE chapters (
  id          VARCHAR(64)  PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  -- Optional 2-3 line Korean intro. NULL until hand-written pass.
  intro       VARCHAR(500) DEFAULT NULL,
  -- Stable display ordering — habit formation needs "내 다섯 번째 챕터"
  -- to be the same chapter every session.
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_sort_order (sort_order)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
