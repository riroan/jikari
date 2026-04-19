-- 0011_expression_cards: 일상표현 subject — 통째 암기형 관용구 카드.
-- Design: ~/.gstack/projects/jikari/riroan-main-design-20260419-220004.md
-- Eng review locked: column-per-field shape (not grammar_cards JSON payload);
-- ruby single field (VocabCard naming), register ENUM 3-tier, idx_register for
-- future same-register distractor rule (seed 50+ 재도입 예정).

CREATE TABLE expression_cards (
  id             VARCHAR(64)  PRIMARY KEY,
  -- 한국어 상황 문맥 ("퇴근할 때 동료에게"). Recall 퀴즈의 질문 프롬프트.
  situation_ko   VARCHAR(255) NOT NULL,
  -- 일본어 표현 본체. 통째 recall 대상.
  expression_jp  VARCHAR(128) NOT NULL,
  -- Optional furigana markup: `{お疲れ様|おつかれさま}でした`. VocabCard 네이밍 정렬.
  ruby           VARCHAR(256) NULL,
  -- casual / polite / humble. DB-level validation via ENUM.
  register       ENUM('casual', 'polite', 'humble') NOT NULL,
  -- 한국어 뜻 ("수고하셨습니다"). Recognition 퀴즈 정답 + 뒷면 본문.
  translation_ko VARCHAR(255) NOT NULL,
  -- Optional 사용 노트 (존대 대상, 줄임말 팁 등). 뒷면 caption 영역.
  note_ko        VARCHAR(500) NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP NOT NULL,
  -- Recall distractor 규칙이 seed 50+에서 same-register 우선으로 재도입될 때
  -- WHERE register = ? 풀 필터용.
  INDEX idx_register (register)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
