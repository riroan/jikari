-- 상용한자표(2010)에 없는 훈독 정리 (2026-11-04). 앱은 상용한자 범위를 가르친다.
-- 門: モン・かど (と 없음) / 陽: ヨウ뿐 (ひ 없음) / 児: ジ・ニ뿐 (こ 없음)
-- 果: カ・はたす・はてる・はて — く는 숙자훈 果物(くだもの)에서 잘라낸 것이라 단독 읽기가 아니다.
-- 훈독이 비면 한자 퀴즈는 음독 문제로 넘어간다 (generateKanjiChoices 폴백).
-- 데이터 전용·멱등: kun_readings만 바꾸고 id는 그대로.

UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かど') WHERE id = '門';
UPDATE kanji_cards SET kun_readings = JSON_ARRAY() WHERE id = '陽';
UPDATE kanji_cards SET kun_readings = JSON_ARRAY() WHERE id = '児';
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はたす', 'はてる') WHERE id = '果';
