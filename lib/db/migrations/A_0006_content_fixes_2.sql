-- Content QA fixes 2 (2026-11). Data-only, idempotent; ids unchanged (learning_states FK intact).

-- s72/s145: 사전형은 문맥상 부자연스러움 → 知っている / 忘れた, 번역과 시제 일치.
UPDATE sentence_cards
  SET sentence = '彼の名前を＿＿＿います。', sentence_ruby = '{彼|かれ}の{名前|なまえ}を＿＿＿います。',
      blank = '知って', blank_ruby = '{知|し}って',
      distractors = JSON_ARRAY('飲んで', '閉めて', '走って'),
      translation = '그의 이름을 알고 있다.'
  WHERE id = 's72';
UPDATE sentence_cards
  SET blank = '忘れた', blank_ruby = '{忘|わす}れた',
      distractors = JSON_ARRAY('売った', '泳いだ', '歩いた')
  WHERE id = 's145';

-- s149: 「音楽を感じる」보다 자연스러운 コロケーション.
UPDATE sentence_cards
  SET sentence = '春の風を＿＿＿。', sentence_ruby = '{春|はる}の{風|かぜ}を＿＿＿。',
      translation = '봄바람을 느낀다.'
  WHERE id = 's149';

-- 정답이 둘 이상 성립하던 선지 제거 (번역만으로 갈리던 것).
UPDATE sentence_cards SET distractors = JSON_ARRAY('上手', '便利', '親切')   WHERE id = 's36';
UPDATE sentence_cards SET distractors = JSON_ARRAY('忙しい', '眠い', 'うれしい') WHERE id = 's61';
UPDATE sentence_cards SET distractors = JSON_ARRAY('旅行', '結婚', '出発')   WHERE id = 's126';
UPDATE sentence_cards SET distractors = JSON_ARRAY('で', 'と', 'を')         WHERE id = 'p008';
-- p009: 「駅から五分」도 성립 → 출발점(家から)을 문장에 넣어 まで만 남김.
UPDATE sentence_cards
  SET sentence = '家から駅＿＿＿五分かかります。',
      sentence_ruby = '{家|いえ}から{駅|えき}＿＿＿{五分|ごふん}かかります。',
      translation = '집에서 역까지 5분 걸립니다.'
  WHERE id = 'p009';
UPDATE sentence_cards SET distractors = JSON_ARRAY('を', 'で', 'へ')         WHERE id = 'p015';
UPDATE sentence_cards SET distractors = JSON_ARRAY('で', 'まで', 'を')       WHERE id = 'p019';
UPDATE sentence_cards SET distractors = JSON_ARRAY('を', 'も', 'に')         WHERE id = 'p027';

-- e003: ございます는 겸양어가 아니라 정중어(丁重語). register enum(humble)은 유지, 노트만 수정.
UPDATE expression_cards
  SET note_ko = 'ごめんなさい보다 훨씬 격식. 비즈니스 기본 사과. 「ございません」은 「ない」의 정중한 격식체(丁重語)로, 자신을 낮추는 겸양어가 아니라 말투 자체를 격식 있게 만듦'
  WHERE id = 'e003';
