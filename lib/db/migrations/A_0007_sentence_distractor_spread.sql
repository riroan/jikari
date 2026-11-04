-- 문장 빈칸 오답 쏠림 정리 (2026-11-04).
-- 時計·傘·花가 286장 중 43·41·39장에서 오답이었다. 時計·花는 어디서도 정답이 아니라
-- 일본어를 몰라도 "저건 정답이 아니다"로 소거됐다. 다른 문제의 정답 명사로 분산했고
-- (각 15장 이하), 문맥상 성립하던 오답도 함께 바꿨다 (公園に花がさく, 毎日電話する 등).
-- 데이터 전용·멱등: distractors만 바꾸고 id는 그대로 (learning_states 유지).

-- ＿＿＿で寝る。 [部屋]  時計,果物,手紙 → お弁当,果物,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('お弁当', '果物', '手紙') WHERE id = 's40';
-- 銀行で＿＿＿を借りる。 [お金]  時計,手紙,果物 → 予定,手紙,果物
UPDATE sentence_cards SET distractors = JSON_ARRAY('予定', '手紙', '果物') WHERE id = 's56';
-- ＿＿＿を毎日食べる。 [野菜]  時計,車,手紙 → 仕事,車,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('仕事', '車', '手紙') WHERE id = 's57';
-- 私の＿＿＿は田中です。 [名前]  時計,公園,果物 → 会議,公園,果物
UPDATE sentence_cards SET distractors = JSON_ARRAY('会議', '公園', '果物') WHERE id = 's59';
-- 妹は＿＿＿が好きです。 [魚]  時計,銀行,手紙 → 番号,銀行,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('番号', '銀行', '手紙') WHERE id = 's66';
-- 朝＿＿＿を飲む。 [水]  本,時計,手紙 → 本,冬,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('本', '冬', '手紙') WHERE id = 's67';
-- ＿＿＿で友達に会う。 [駅]  時計,果物,魚 → 切符,果物,魚
UPDATE sentence_cards SET distractors = JSON_ARRAY('切符', '果物', '魚') WHERE id = 's68';
-- 母に＿＿＿を書く。 [手紙]  時計,魚,車 → 動物,魚,車
UPDATE sentence_cards SET distractors = JSON_ARRAY('動物', '魚', '車') WHERE id = 's70';
-- ＿＿＿が降る。 [雨]  車,時計,手紙 → 車,台所,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('車', '台所', '手紙') WHERE id = 's75';
-- 病気で＿＿＿に行く。 [病院]  時計,果物,手紙 → 歴史,果物,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('歴史', '果物', '手紙') WHERE id = 's81';
-- 毎朝＿＿＿を歌う。 [歌]  肉,時計,手紙 → 肉,教室,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('肉', '教室', '手紙') WHERE id = 's82';
-- 友達と＿＿＿を見る。 [映画]  車,時計,公園 → 車,理由,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('車', '理由', '公園') WHERE id = 's83';
-- 私は＿＿＿が好きです。 [音楽]  銀行,時計,電話 → 銀行,旅館,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('銀行', '旅館', '電話') WHERE id = 's85';
-- 母が＿＿＿を作る。 [料理]  時計,手紙,公園 → 空,手紙,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('空', '手紙', '公園') WHERE id = 's86';
-- 父は＿＿＿で忙しい。 [仕事]  手紙,果物,傘 → 手紙,果物,名前
UPDATE sentence_cards SET distractors = JSON_ARRAY('手紙', '果物', '名前') WHERE id = 's87';
-- 来週＿＿＿に行く。 [旅行]  野菜,手紙,時計 → 野菜,手紙,漢字
UPDATE sentence_cards SET distractors = JSON_ARRAY('野菜', '手紙', '漢字') WHERE id = 's88';
-- 母は＿＿＿で料理をする。 [台所]  公園,銀行,時計 → 公園,銀行,晩ご飯
UPDATE sentence_cards SET distractors = JSON_ARRAY('公園', '銀行', '晩ご飯') WHERE id = 's89';
-- 先生に＿＿＿をする。 [質問]  時計,傘,手紙 → 最後,最近,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('最後', '最近', '手紙') WHERE id = 's90';
-- これは＿＿＿の本です。 [自分]  時計,傘,手紙 → 切符,鍵,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('切符', '鍵', '手紙') WHERE id = 's96';
-- 日本語の＿＿＿を知る。 [意味]  手紙,時計,電車 → 手紙,注意,電車
UPDATE sentence_cards SET distractors = JSON_ARRAY('手紙', '注意', '電車') WHERE id = 's97';
-- 雨の日は＿＿＿を持って出かける。 [傘]  銀行,時計,魚 → 銀行,準備,魚
UPDATE sentence_cards SET distractors = JSON_ARRAY('銀行', '準備', '魚') WHERE id = 's100';
-- ＿＿＿十時に学校に行く。 [午前]  色,花,傘 → 色,漢字,理由
UPDATE sentence_cards SET distractors = JSON_ARRAY('色', '漢字', '理由') WHERE id = 's101';
-- ＿＿＿はとても寒い。 [冬]  傘,公園,手紙 → 生活,公園,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('生活', '公園', '手紙') WHERE id = 's102';
-- ＿＿＿はとても暑い。 [夏]  銀行,時計,電話 → 銀行,留学,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('銀行', '留学', '電話') WHERE id = 's103';
-- ＿＿＿に花がさく。 [春]  時計,公園,電話 → 番号,宿題,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('番号', '宿題', '電話') WHERE id = 's104';
-- ＿＿＿で東京に行く。 [飛行機]  時計,手紙,公園 → 空,手紙,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('空', '手紙', '公園') WHERE id = 's107';
-- 毎朝＿＿＿で学校に行く。 [自転車]  時計,果物,花 → 社長,果物,空
UPDATE sentence_cards SET distractors = JSON_ARRAY('社長', '果物', '空') WHERE id = 's108';
-- 大きな＿＿＿が見える。 [建物]  時計,電話,傘 → 約束,電話,答え
UPDATE sentence_cards SET distractors = JSON_ARRAY('約束', '電話', '答え') WHERE id = 's109';
-- 十二時に＿＿＿を食べる。 [昼ご飯]  時計,花,手紙 → 時計,約束,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('時計', '約束', '手紙') WHERE id = 's111';
-- 動物園で＿＿＿を見る。 [動物]  時計,花,電話 → 答え,結果,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('答え', '結果', '電話') WHERE id = 's113';
-- 日本語を勉強する＿＿＿が好きです。 [時間]  電話,花,色 → 電話,絵,色
UPDATE sentence_cards SET distractors = JSON_ARRAY('電話', '絵', '色') WHERE id = 's114';
-- ＿＿＿から雪が降る。 [空]  手紙,色,花 → 手紙,色,自分
UPDATE sentence_cards SET distractors = JSON_ARRAY('手紙', '色', '自分') WHERE id = 's115';
-- 先生の電話＿＿＿を聞く。 [番号]  色,花,手紙 → 色,自転車,手紙
UPDATE sentence_cards SET distractors = JSON_ARRAY('色', '自転車', '手紙') WHERE id = 's117';
-- 公園で＿＿＿する。 [運動]  傘,時計,電話 → 鍵,時計,名前
UPDATE sentence_cards SET distractors = JSON_ARRAY('鍵', '時計', '名前') WHERE id = 's118';
-- 犬やねこは＿＿＿です。 [動物]  傘,手紙,果物 → 誕生日,手紙,果物
UPDATE sentence_cards SET distractors = JSON_ARRAY('誕生日', '手紙', '果物') WHERE id = 's120';
-- 学生が＿＿＿に入る。 [教室]  花,傘,時計 → 説明,雪,時計
UPDATE sentence_cards SET distractors = JSON_ARRAY('説明', '雪', '時計') WHERE id = 's121';
-- 明日＿＿＿がある。 [試験]  花,電話,傘 → 辞書,空,鍵
UPDATE sentence_cards SET distractors = JSON_ARRAY('辞書', '空', '鍵') WHERE id = 's122';
-- 毎日＿＿＿する。 [勉強]  傘,花,電話 → 名前,部屋,雪
UPDATE sentence_cards SET distractors = JSON_ARRAY('名前', '部屋', '雪') WHERE id = 's123';
-- 先生の＿＿＿を聞く。 [意見]  時計,花,傘 → 時計,雪,鍵
UPDATE sentence_cards SET distractors = JSON_ARRAY('時計', '雪', '鍵') WHERE id = 's125';
-- 新しい＿＿＿が始まる。 [時代]  傘,花,公園 → 飛行機,お弁当,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('飛行機', 'お弁当', '公園') WHERE id = 's129';
-- 寿司を＿＿＿食べたことがある。 [一度]  色,花,傘 → 色,予定,仕事
UPDATE sentence_cards SET distractors = JSON_ARRAY('色', '予定', '仕事') WHERE id = 's130';
-- 事務所は＿＿＿にある。 [二階]  花,傘,電話 → 会議,全部,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('会議', '全部', '電話') WHERE id = 's131';
-- 野菜を＿＿＿食べる。 [全部]  公園,手紙,花 → 公園,手紙,写真
UPDATE sentence_cards SET distractors = JSON_ARRAY('公園', '手紙', '写真') WHERE id = 's132';
-- 明日の＿＿＿を教えてください。 [予定]  傘,花,色 → 冬,切符,色
UPDATE sentence_cards SET distractors = JSON_ARRAY('冬', '切符', '色') WHERE id = 's133';
-- ＿＿＿で意味を調べる。 [辞書]  傘,花,公園 → 動物,午前,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('動物', '午前', '公園') WHERE id = 's134';
-- 毎朝＿＿＿を読む。 [新聞]  花,傘,電話 → 午後,台所,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('午後', '台所', '電話') WHERE id = 's135';
-- 先生が＿＿＿を書く。 [答え]  傘,魚,花 → 雪,魚,空
UPDATE sentence_cards SET distractors = JSON_ARRAY('雪', '魚', '空') WHERE id = 's136';
-- 午後＿＿＿がある。 [会議]  傘,魚,公園 → 図書館,魚,公園
UPDATE sentence_cards SET distractors = JSON_ARRAY('図書館', '魚', '公園') WHERE id = 's137';
-- ＿＿＿を持って学校に行く。 [お弁当]  花,傘,電話 → 声,夏,番号
UPDATE sentence_cards SET distractors = JSON_ARRAY('声', '夏', '番号') WHERE id = 's140';
-- 大きな＿＿＿で話す。 [声]  花,傘,時計 → 問題,番号,夏
UPDATE sentence_cards SET distractors = JSON_ARRAY('問題', '番号', '夏') WHERE id = 's141';
-- 親を心から＿＿＿する。 [愛]  傘,時計,電話 → 声,宿題,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('声', '宿題', '電話') WHERE id = 's150';
-- 毎日ピアノの＿＿＿をする。 [練習]  傘,時計,花 → 将来,建物,意味
UPDATE sentence_cards SET distractors = JSON_ARRAY('将来', '建物', '意味') WHERE id = 's152';
-- 兄は来年＿＿＿する。 [結婚]  時計,花,電話 → 意見,愛,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('意見', '愛', '電話') WHERE id = 's153';
-- アメリカに＿＿＿する。 [留学]  傘,花,時計 → 宿題,将来,時計
UPDATE sentence_cards SET distractors = JSON_ARRAY('宿題', '将来', '時計') WHERE id = 's161';
-- 日本での＿＿＿は楽しい。 [生活]  傘,花,電話 → 建物,花,電話
UPDATE sentence_cards SET distractors = JSON_ARRAY('建物', '花', '電話') WHERE id = 's162';
