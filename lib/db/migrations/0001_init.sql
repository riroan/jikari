CREATE TABLE kanji_cards (
  id             VARCHAR(8)   PRIMARY KEY,
  kanji          VARCHAR(8)   NOT NULL,
  on_readings    JSON         NOT NULL,
  kun_readings   JSON         NOT NULL,
  meanings       JSON         NOT NULL,
  jlpt_level     TINYINT      NOT NULL,
  korean_hanja   VARCHAR(8)   NOT NULL,
  korean_sound   JSON         NOT NULL,
  korean_meaning VARCHAR(255) NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE vocab_cards (
  id              VARCHAR(64)  PRIMARY KEY,
  word            VARCHAR(128) NOT NULL,
  reading         VARCHAR(128) NOT NULL,
  meanings        JSON         NOT NULL,
  korean_meanings JSON         NOT NULL,
  ruby            VARCHAR(256) NULL,
  jlpt_level      TINYINT      NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE sentence_cards (
  id             VARCHAR(64)  PRIMARY KEY,
  sentence       TEXT         NOT NULL,
  sentence_ruby  TEXT         NULL,
  blank          VARCHAR(128) NOT NULL,
  blank_ruby     VARCHAR(256) NULL,
  distractors    JSON         NOT NULL,
  translation    TEXT         NOT NULL,
  jlpt_level     TINYINT      NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE learning_states (
  card_key       VARCHAR(80)  PRIMARY KEY,
  mode           VARCHAR(16)  NOT NULL,
  card_id        VARCHAR(64)  NOT NULL,
  box            TINYINT      NOT NULL,
  next_due       BIGINT       NOT NULL,
  correct_streak INT          NOT NULL,
  last_reviewed  BIGINT       NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE heatmap_days (
  day   CHAR(10) PRIMARY KEY,
  count INT      NOT NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE app_settings (
  id                  TINYINT     PRIMARY KEY DEFAULT 1,
  theme               VARCHAR(16) NOT NULL,
  daily_new_limit     INT         NOT NULL,
  daily_review_limit  INT         NOT NULL,
  show_furigana       BOOLEAN     NOT NULL,
  last_active_at      BIGINT      NOT NULL,
  current_streak      INT         NOT NULL,
  schema_version      INT         NOT NULL,
  CONSTRAINT single_row CHECK (id = 1)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
