-- 0008_quiz_stats: lifetime ◯/✕ tallies per quiz page
CREATE TABLE quiz_stats (
  stat_key      VARCHAR(32) PRIMARY KEY,
  correct_count INT NOT NULL DEFAULT 0,
  wrong_count   INT NOT NULL DEFAULT 0
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
