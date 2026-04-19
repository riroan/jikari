-- 0010_chapter_members: polymorphic chapter ↔ card membership.
-- (mode, card_id) uniquely identifies a card across the 5 content modes.
-- No SQL FK to content tables (kanji/vocab/sentence/grammar) — fail-soft on
-- stale references is preferred over hard cascade, per design.

CREATE TABLE chapter_members (
  chapter_id  VARCHAR(64)  NOT NULL,
  mode        VARCHAR(16)  NOT NULL,
  card_id     VARCHAR(64)  NOT NULL,
  -- Same card can belong to multiple chapters (e.g., 食 in "음식" and
  -- "N5 한자 일상 동작"), so PK is the full triple, not (chapter,card).
  PRIMARY KEY (chapter_id, mode, card_id),
  -- Reverse lookup: given a card, which chapters contain it?
  INDEX idx_card (mode, card_id),
  CONSTRAINT fk_member_chapter FOREIGN KEY (chapter_id)
    REFERENCES chapters(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
