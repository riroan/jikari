-- 문장 빈칸 동사 오답 쏠림 정리 (2026-11-04). A_0007의 명사 정리에 이어서.
-- 売る·閉める는 어디서도 정답이 아닌데 25·20장에서 오답이었다. 다른 문제의 정답 동사로
-- 분산했고 (각 10장 이하), 문맥상 성립하던 오답도 바꿨다 (ねこが寝る 등).
-- 데이터 전용·멱등: distractors만 바꾸고 id는 그대로.

-- 公園で＿＿＿。 [遊ぶ]  売る,閉める,開ける → 払う,貸す,開ける
UPDATE sentence_cards SET distractors = JSON_ARRAY('払う', '貸す', '開ける') WHERE id = 's33';
-- コーヒーを＿＿＿。 [飲む]  見る,書く,閉める → 見る,書く,泣く
UPDATE sentence_cards SET distractors = JSON_ARRAY('見る', '書く', '泣く') WHERE id = 's43';
-- 毎日本を＿＿＿。 [読む]  乗る,走る,閉める → 乗る,走る,分かる
UPDATE sentence_cards SET distractors = JSON_ARRAY('乗る', '走る', '分かる') WHERE id = 's51';
-- 日本語を＿＿＿。 [話す]  食べる,売る,泳ぐ → 食べる,動く,泳ぐ
UPDATE sentence_cards SET distractors = JSON_ARRAY('食べる', '動く', '泳ぐ') WHERE id = 's52';
-- 手紙を＿＿＿。 [書く]  飲む,乗る,閉める → 飲む,乗る,遊ぶ
UPDATE sentence_cards SET distractors = JSON_ARRAY('飲む', '乗る', '遊ぶ') WHERE id = 's54';
-- 学校まで＿＿＿。 [歩く]  食べる,閉める,開ける → 食べる,受ける,開ける
UPDATE sentence_cards SET distractors = JSON_ARRAY('食べる', '受ける', '開ける') WHERE id = 's55';
-- 毎朝顔を＿＿＿。 [洗う]  書く,走る,売る → 書く,走る,起きる
UPDATE sentence_cards SET distractors = JSON_ARRAY('書く', '走る', '起きる') WHERE id = 's60';
-- 週末は家で＿＿＿。 [休む]  走る,泳ぐ,閉める → 走る,泳ぐ,変わる
UPDATE sentence_cards SET distractors = JSON_ARRAY('走る', '泳ぐ', '変わる') WHERE id = 's65';
-- バスを＿＿＿。 [待つ]  食べる,閉める,書く → 食べる,始まる,書く
UPDATE sentence_cards SET distractors = JSON_ARRAY('食べる', '始まる', '書く') WHERE id = 's74';
-- 父は毎朝新聞を＿＿＿。 [読む]  食べる,泳ぐ,閉める → 食べる,泳ぐ,遊ぶ
UPDATE sentence_cards SET distractors = JSON_ARRAY('食べる', '泳ぐ', '遊ぶ') WHERE id = 's76';
-- 子供が大きな声で＿＿＿。 [笑う]  泳ぐ,寝る,売る → 泳ぐ,寝る,待つ
UPDATE sentence_cards SET distractors = JSON_ARRAY('泳ぐ', '寝る', '待つ') WHERE id = 's143';
-- 赤ちゃんが＿＿＿。 [泣く]  歌う,売る,歩く → 歌う,思う,歩く
UPDATE sentence_cards SET distractors = JSON_ARRAY('歌う', '思う', '歩く') WHERE id = 's144';
-- 景色をカメラで＿＿＿。 [写す]  売る,歩く,閉める → 感じる,歩く,教える
UPDATE sentence_cards SET distractors = JSON_ARRAY('感じる', '歩く', '教える') WHERE id = 's148';
-- 春の風を＿＿＿。 [感じる]  売る,歩く,閉める → 止まる,歩く,決める
UPDATE sentence_cards SET distractors = JSON_ARRAY('止まる', '歩く', '決める') WHERE id = 's149';
-- 先生から日本語を＿＿＿。 [習う]  売る,泳ぐ,閉める → 泣く,泳ぐ,閉める
UPDATE sentence_cards SET distractors = JSON_ARRAY('泣く', '泳ぐ', '閉める') WHERE id = 's151';
-- 好きな色を＿＿＿。 [選ぶ]  売る,寝る,歩く → 走る,寝る,歩く
UPDATE sentence_cards SET distractors = JSON_ARRAY('走る', '寝る', '歩く') WHERE id = 's154';
-- 旅行の予定を＿＿＿。 [決める]  売る,寝る,泳ぐ → 終わる,寝る,泳ぐ
UPDATE sentence_cards SET distractors = JSON_ARRAY('終わる', '寝る', '泳ぐ') WHERE id = 's155';
-- 季節が＿＿＿。 [変わる]  売る,寝る,閉める → 習う,寝る,閉める
UPDATE sentence_cards SET distractors = JSON_ARRAY('習う', '寝る', '閉める') WHERE id = 's156';
-- 明日の予定を＿＿＿。 [変える]  売る,寝る,泳ぐ → 起きる,寝る,泳ぐ
UPDATE sentence_cards SET distractors = JSON_ARRAY('起きる', '寝る', '泳ぐ') WHERE id = 's157';
-- バスが駅の前を＿＿＿。 [通る]  売る,寝る,泳ぐ → 洗う,寝る,泳ぐ
UPDATE sentence_cards SET distractors = JSON_ARRAY('洗う', '寝る', '泳ぐ') WHERE id = 's158';
-- 机の上のねこが＿＿＿。 [動く]  売る,寝る,閉める → 通る,払う,閉める
UPDATE sentence_cards SET distractors = JSON_ARRAY('通る', '払う', '閉める') WHERE id = 's159';
-- 信号で車が＿＿＿。 [止まる]  売る,寝る,閉める → 遊ぶ,寝る,閉める
UPDATE sentence_cards SET distractors = JSON_ARRAY('遊ぶ', '寝る', '閉める') WHERE id = 's160';
