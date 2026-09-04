-- 선지 품사 불일치 수정 (2026-09-04).
-- 「〜です」 앞 형용사 자리에 동사 사전형이 섞여 있었다. 뜻을 몰라도 형태만
-- 보고 셋 다 지워지므로 4지선다가 사실상 1지선다였다. 같은 품사로 교체.
-- 데이터 전용: id는 그대로 (learning_states FK 유지).

-- 今日は＿＿＿です。(바쁩니다)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('暑い', '寒い', '楽しい')
  WHERE id = 's7';

-- この本は＿＿＿です。(새롭습니다)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('古い', '難しい', '楽しい')
  WHERE id = 's8';

-- 夏は＿＿＿です。(덥습니다)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('寒い', '暗い', '忙しい')
  WHERE id = 's9';

-- 富士山は＿＿＿山です。(높은 산)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('小さい', '古い', '近い')
  WHERE id = 's20';

-- 猫は＿＿＿動物です。(작은 동물)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('大きい', '強い', '弱い')
  WHERE id = 's21';

-- この店は＿＿＿です。(쌉니다)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('高い', '古い', '遠い')
  WHERE id = 's22';

-- お金が＿＿＿。(돈이 없다)
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('多い', '少ない', '高い')
  WHERE id = 's24';

-- 私は犬が＿＿＿です。(좋아한다) — 好き는 な형용사라 い형용사 오답도 형태는
-- 맞지만 「犬が寒い」는 뜻이 성립하지 않는다. な형용사로 교체.
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('嫌い', '上手', '大切')
  WHERE id = 's36';

-- 大学で＿＿＿する。(연구한다) — する 명사 자리에 동사 사전형이었다.
UPDATE sentence_cards
  SET distractors = JSON_ARRAY('勉強', '質問', '運動')
  WHERE id = 's126';
