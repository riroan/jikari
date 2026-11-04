-- 한자 음독 오류 2건 (2026-11-04).
-- 打: 'だーす'는 외래어 ダース(다스)를 이 한자로 적는 것일 뿐 음독이 아니다.
-- 州: 'す'(中州)는 훈독인데 음독에도 들어가 있었다 (훈독 쪽에는 그대로 남는다).
-- 데이터 전용·멱등: on_readings만 바꾸고 id는 그대로.

UPDATE kanji_cards SET on_readings = JSON_ARRAY('だ') WHERE id = '打';
UPDATE kanji_cards SET on_readings = JSON_ARRAY('しゅう') WHERE id = '州';
