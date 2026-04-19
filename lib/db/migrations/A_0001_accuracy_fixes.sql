-- Content accuracy fixes from 2026-04-19 remote DB audit.
-- Data-only: no schema changes, no touched IDs (learning_states keeps FK integrity).

-- 半: kun reading is なかば (半ば). Bare "なか" collided with 中(なか).
UPDATE kanji_cards
  SET kun_readings = JSON_ARRAY('なかば')
  WHERE id = '半';

-- 使: align korean_meaning with traditional 訓 used by sibling entries
-- (研=갈, 受=받을, 取=가질, 持=가질). "사용하다" was the odd one out.
UPDATE kanji_cards
  SET korean_meaning = '부릴'
  WHERE id = '使';

-- いいえ: "아니오" is archaic command form; modern polite decline is "아니요".
UPDATE vocab_cards
  SET korean_meanings = JSON_ARRAY('아니요')
  WHERE id = 'いいえ';

-- 一度: adverbial "once" is spelled as one word in Korean.
UPDATE vocab_cards
  SET korean_meanings = JSON_ARRAY('한번')
  WHERE id = '一度';

-- s124: 車に注意する — "차를 주의한다" is ungrammatical in Korean;
-- natural rendering is "차를 조심한다".
UPDATE sentence_cards
  SET translation = '차를 조심한다.'
  WHERE id = 's124';

-- s130: もう一度食べた = "한 번 더 먹었다" (ate once more),
-- not "이미 한 번 먹었다" (already once).
UPDATE sentence_cards
  SET translation = '한 번 더 먹었다.'
  WHERE id = 's130';
