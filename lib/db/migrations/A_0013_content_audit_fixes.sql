-- 콘텐츠 점검 수정 (2026-11-06). 운영 DB 전수 검토에서 나온 "확실한 오류"만.
-- id는 모두 그대로 (learning_states 유지).

-- 한자: 훈과 음이 어긋난 한국어 음 / 훈이 아닌 뜻
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('담') WHERE id = '担';  -- 멜 담 (擔)
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('잠') WHERE id = '蚕';  -- 누에 잠 (蠶)
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('칙') WHERE id = '則';  -- 법칙 칙
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('률') WHERE id = '率';  -- 비율 률
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('상') WHERE id = '状';  -- 형상 상 (狀)
UPDATE kanji_cards SET korean_sound = JSON_ARRAY('속') WHERE id = '属';  -- 무리 속 (屬)
UPDATE kanji_cards SET korean_meaning = '부릴' WHERE id = '使';          -- '사용하다'는 훈이 아님

-- 단어
UPDATE vocab_cards SET ruby = '{物|ぶっ}{色|しょく}' WHERE id = '物色';  -- 읽기 ぶっしょく와 불일치
UPDATE vocab_cards SET korean_meanings = JSON_ARRAY('청장', '관청의 장') WHERE id = '長官';  -- 한국어 장관 = 大臣
UPDATE vocab_cards SET word = 'きれい', ruby = NULL WHERE id = 'きれい';  -- 綺는 상용한자 밖
UPDATE vocab_cards SET korean_meanings = JSON_ARRAY('아니요') WHERE id = 'いいえ';  -- 대답말 표준어

-- 표현
UPDATE expression_cards SET situation_ko = '퇴근하는 동료에게' WHERE id = 'e001';  -- 본인 퇴근은 お先に失礼します (e025)
UPDATE expression_cards SET note_ko = 'ごめんなさい보다 훨씬 격식. 비즈니스 기본 사과. 「ございません」은 「ない」의 정중한 격식체(丁寧語)로, 자신을 낮추는 겸양어가 아니라 말투 자체를 격식 있게 만듦' WHERE id = 'e003';  -- ございます는 丁寧語
UPDATE expression_cards SET note_ko = '「〜くなりませんか」는 정중하게 부탁하는 형태입니다' WHERE id = 'en16';  -- 安い는 い형용사

-- 챕터 소개 (data/chapters.config.ts와 동일하게)
UPDATE chapters SET intro = REPLACE(intro, '韓자와', '한국 한자와') WHERE id = 'a3-home';
UPDATE chapters SET intro = REPLACE(intro, '関連 입자', '관련 입자') WHERE id = 'a4-transport';
UPDATE chapters SET intro = REPLACE(intro, '셋 다 "에"로 번역되니까', 'に·へ는 "에", で는 "에서·로"로 번역돼서') WHERE id = 'b2-ni-de-he';
UPDATE chapters SET intro = REPLACE(intro, '위 4개 조사', '이 5개 조사') WHERE id = 'b4-other-particles';
