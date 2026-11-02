-- Content QA fixes (2026-11). Data-only, idempotent; ids unchanged (learning_states FK intact).

-- 常用漢字 밖 글자(猫・咲・嘘・箸) 제거: 가나로 바꾸거나 선지에서 교체.
-- s66: 정답이 가나 하나만 도드라지는 것을 피하려고 다른 명사(魚)로 교체.
UPDATE sentence_cards
  SET blank = '魚', blank_ruby = '{魚|さかな}', translation = '여동생은 생선을 좋아한다.'
  WHERE id = 's66';
UPDATE sentence_cards SET distractors = JSON_ARRAY('車', '駅', '病院')       WHERE id = 's73';
UPDATE sentence_cards SET distractors = JSON_ARRAY('駅', '魚', '電話')       WHERE id = 's99';
UPDATE sentence_cards SET distractors = JSON_ARRAY('銀行', '時計', '魚')     WHERE id = 's100';
UPDATE sentence_cards
  SET sentence = '＿＿＿に花がさく。', sentence_ruby = '＿＿＿に{花|はな}がさく。'
  WHERE id = 's104';
UPDATE sentence_cards SET distractors = JSON_ARRAY('時計', '魚', '電話')     WHERE id = 's110';
UPDATE sentence_cards
  SET sentence = '犬やねこは＿＿＿です。', sentence_ruby = '{犬|いぬ}やねこは＿＿＿です。'
  WHERE id = 's120';
UPDATE sentence_cards
  SET sentence = '机の上のねこが＿＿＿。', sentence_ruby = '{机|つくえ}の{上|うえ}のねこが＿＿＿。'
  WHERE id = 's159';
UPDATE sentence_cards
  SET sentence = '庭にねこが＿＿＿います。', sentence_ruby = '{庭|にわ}にねこが＿＿＿います。'
  WHERE id = 'sn04';

-- s117: 「電話番号は三番です」는 부자연스러움(전화번호가 '3번'일 수 없음).
UPDATE sentence_cards
  SET sentence = '先生の電話＿＿＿を聞く。',
      sentence_ruby = '{先生|せんせい}の{電話|でんわ}＿＿＿を{聞|き}く。',
      translation = '선생님의 전화번호를 묻는다.'
  WHERE id = 's117';

-- s127: 「プレゼントを受ける」는 부자연스러움 (受け取る/もらう). 受ける가 자연스러운 試験으로 교체.
UPDATE sentence_cards
  SET sentence = '来週、日本語の試験を＿＿＿。',
      sentence_ruby = '{来週|らいしゅう}、{日本語|にほんご}の{試験|しけん}を＿＿＿。',
      translation = '다음 주에 일본어 시험을 본다.'
  WHERE id = 's127';

-- s130: 「もう一度食べた」는 '한 번 더'라는 뜻이라 번역(이미 한 번)과 어긋남.
UPDATE sentence_cards
  SET sentence = '寿司を＿＿＿食べたことがある。',
      sentence_ruby = '{寿司|すし}を＿＿＿{食|た}べたことがある。',
      translation = '초밥을 한 번 먹어 본 적이 있다.'
  WHERE id = 's130';

-- 조사: 정답이 둘이 되는 선지 제거 (p012 や↔と, p029 と↔や, p028 よ↔ね).
UPDATE sentence_cards SET distractors = JSON_ARRAY('を', 'も', 'の') WHERE id = 'p012';
UPDATE sentence_cards SET distractors = JSON_ARRAY('に', 'も', 'の') WHERE id = 'p029';
UPDATE sentence_cards SET distractors = JSON_ARRAY('は', 'か', 'の') WHERE id = 'p028';

-- 문법 카드 payload (JSON 텍스트 치환이라 재실행해도 결과 동일).
UPDATE grammar_cards
  SET payload = CAST(REPLACE(CAST(payload AS CHAR CHARACTER SET utf8mb4), '{箸|はし}', 'はし') AS JSON)
  WHERE id = 'pattern-kata';
UPDATE grammar_cards
  SET payload = CAST(REPLACE(CAST(payload AS CHAR CHARACTER SET utf8mb4), '{嘘|うそ}', 'うそ') AS JSON)
  WHERE id = 'pattern-tewa-ikenai';
-- おいし＿＿＿: 「そうです」도 정답이라 선지에서 제거.
UPDATE grammar_cards
  SET payload = JSON_SET(payload, '$.quizzes[0].distractors[1]', 'つもり')
  WHERE id = 'pattern-sou-appearance'
    AND JSON_UNQUOTE(JSON_EXTRACT(payload, '$.quizzes[0].distractors[1]')) = 'そうです';
