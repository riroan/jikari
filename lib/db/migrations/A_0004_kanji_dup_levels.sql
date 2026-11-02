-- 시드 파일에 중복돼 있던 한자 14개의 JLPT 급수 정리 (2026-11-02).
-- 같은 한자가 두 시드(n3/n4/n5 batch)에 서로 다른 급수로 들어 있었고,
-- add-kanji.ts는 이미 있는 id를 건너뛰므로 먼저 import한 쪽이
-- 남았을 수 있다. 급수는 난이도 점수(lib/rating.ts)의 입력이라 틀리면
-- 출제가 어긋난다. 시드는 더 기본 급수 쪽 하나로 합쳤고, 여기서 DB를 맞춘다.
-- 데이터 전용·멱등: 읽기/뜻은 건드리지 않고(A_0001·A_0002 수정 보존) id도
-- 그대로라 learning_states FK가 유지된다.

UPDATE kanji_cards SET jlpt_level = 5 WHERE id IN ('飲', '駅', '兄', '言', '古', '黒', '弟');
UPDATE kanji_cards SET jlpt_level = 4 WHERE id IN ('声', '写', '英', '教', '通', '動', '止');
