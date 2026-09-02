-- A_0002_kun_full_form: 훈독을 어간형 → 전체형으로 통일.
--
-- 초기 데이터는 okurigana를 떼고 어간만 저장했다 (言=い, 食=た). 퀴즈에서
-- 「言」의 답이 「い」로 나와 단어로 읽히지 않는다. grade 1-4 일괄 추가분은
-- 전체형(いう/たべる)으로 넣었기 때문에 한 테이블에 두 표기가 공존했다.
--
-- 판독 개수는 보존한다 — 원본 판독 하나당 전체형 하나로만 매핑하고,
-- 그 자체로 유효한 판독(丸=まる, 日=ひ, 木=こ-)은 건드리지 않는다.
-- 출처: kanjiapi.dev kun_readings. id는 안 바꾸므로 learning_states 무영향.
--
-- 112행. A_0001의 半(なか→なかば) 수정도 이 규칙에 포함된다.

UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ひとつ') WHERE id = '一';  -- ひと
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うえ', 'あげる', 'のぼる') WHERE id = '上';  -- うえ/あ/のぼ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('した', 'さげる', 'くだる') WHERE id = '下';  -- した/さ/くだ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('のる') WHERE id = '乗';  -- の
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('つかえる') WHERE id = '仕';  -- つか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かわる', 'よ') WHERE id = '代';  -- か/よ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('やすむ') WHERE id = '休';  -- やす
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あう') WHERE id = '会';  -- あ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('つくる') WHERE id = '作';  -- つく
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('いる', 'はいる') WHERE id = '入';  -- い/はい
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('まったく', 'すべて') WHERE id = '全';  -- まった/すべ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うつす') WHERE id = '写';  -- うつ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('つめたい', 'ひえる', 'さめる') WHERE id = '冷';  -- つめ/ひ/さ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('でる', 'だす') WHERE id = '出';  -- で/だ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('わける') WHERE id = '分';  -- わ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('きる') WHERE id = '切';  -- き
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('つとめる') WHERE id = '勉';  -- つと
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うごく') WHERE id = '動';  -- うご
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('なかば') WHERE id = '半';  -- なか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とる') WHERE id = '取';  -- と
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うける') WHERE id = '受';  -- う
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ふるい') WHERE id = '古';  -- ふる
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とう') WHERE id = '問';  -- と
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('まわる') WHERE id = '回';  -- まわ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はかる') WHERE id = '図';  -- はか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うる') WHERE id = '売';  -- う
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かわる') WHERE id = '変';  -- か
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('そと', 'ほか', 'はずす') WHERE id = '外';  -- そと/ほか/はず
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おおい') WHERE id = '多';  -- おお
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おおきい') WHERE id = '大';  -- おお
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('すく', 'このむ') WHERE id = '好';  -- す/この
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('まなぶ') WHERE id = '学';  -- まな
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('さむい') WHERE id = '寒';  -- さむ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ねる') WHERE id = '寝';  -- ね
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ちいさい', 'こ', 'お') WHERE id = '小';  -- ちい/こ/お
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('すくない', 'すこし') WHERE id = '少';  -- すく/すこ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かえる') WHERE id = '帰';  -- かえ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ひろい') WHERE id = '広';  -- ひろ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('たてる') WHERE id = '建';  -- た
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ひく') WHERE id = '引';  -- ひ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('まつ') WHERE id = '待';  -- ま
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あと', 'うしろ', 'のち') WHERE id = '後';  -- あと/うし/のち
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('わすれる') WHERE id = '忘';  -- わす
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おもう') WHERE id = '思';  -- おも
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('いそぐ') WHERE id = '急';  -- いそ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('わるい') WHERE id = '悪';  -- わる
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かなしい') WHERE id = '悲';  -- かな
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('もつ') WHERE id = '持';  -- も
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おしえる', 'おそわる') WHERE id = '教';  -- おし/おそ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あたらしい', 'あらた', 'にい') WHERE id = '新';  -- あたら/あら/にい
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('うつる', 'はえる') WHERE id = '映';  -- うつ/は
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はれる') WHERE id = '晴';  -- は
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あつい') WHERE id = '暑';  -- あつ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かく') WHERE id = '書';  -- か
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ある') WHERE id = '有';  -- あ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('くる', 'きたる') WHERE id = '来';  -- く/きた
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はたす', 'く') WHERE id = '果';  -- は/く
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('たのしい') WHERE id = '楽';  -- たの
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とまる', 'やめる') WHERE id = '止';  -- と/や
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あるく', 'あゆむ') WHERE id = '歩';  -- ある/あゆ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('きめる') WHERE id = '決';  -- き
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('なく') WHERE id = '泣';  -- な
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('そそぐ') WHERE id = '注';  -- そそ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('およぐ') WHERE id = '泳';  -- およ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ない') WHERE id = '無';  -- な
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('いきる', 'うまれる', 'なま', 'はえる') WHERE id = '生';  -- い/う/なま/は
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('やむ', 'やまい') WHERE id = '病';  -- や/やまい
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('きる', 'つく') WHERE id = '着';  -- き/つ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('みじかい') WHERE id = '短';  -- みじか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とぐ') WHERE id = '研';  -- と
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('きわめる') WHERE id = '究';  -- きわ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('そら', 'あく', 'から') WHERE id = '空';  -- そら/あ/から
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('たつ', 'たて') WHERE id = '立';  -- た/たて
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('わらう', 'えむ') WHERE id = '笑';  -- わら/え
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('こたえる') WHERE id = '答';  -- こた
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('むすぶ') WHERE id = '結';  -- むす
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ねる') WHERE id = '練';  -- ね
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ならう') WHERE id = '習';  -- なら
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かんがえる') WHERE id = '考';  -- かんが
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('きく', 'きこ') WHERE id = '聞';  -- き/きこ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('みずから') WHERE id = '自';  -- みずか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('くるしい', 'にがい') WHERE id = '苦';  -- くる/にが
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おちる') WHERE id = '落';  -- お
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('いく', 'おこなう', 'ゆく') WHERE id = '行';  -- い/おこな/ゆ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('みる') WHERE id = '見';  -- み
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おぼえる', 'さます') WHERE id = '覚';  -- おぼ/さ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おや', 'したしい') WHERE id = '親';  -- おや/した
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('いう', 'こと') WHERE id = '言';  -- い/こと
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はかる') WHERE id = '計';  -- はか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('こころみる', 'ためす') WHERE id = '試';  -- こころ/ため
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はなす', 'はなし') WHERE id = '話';  -- はな/はなし
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かたる') WHERE id = '語';  -- かた
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('よむ') WHERE id = '読';  -- よ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かす') WHERE id = '貸';  -- か
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はしる') WHERE id = '走';  -- はし
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おきる') WHERE id = '起';  -- お
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あし', 'たりる') WHERE id = '足';  -- あし/た
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ころがる') WHERE id = '転';  -- ころ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('かるい', 'かろやか') WHERE id = '軽';  -- かる/かろ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ちかい') WHERE id = '近';  -- ちか
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とおる', 'かよう') WHERE id = '通';  -- とお/かよ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('はこぶ') WHERE id = '運';  -- はこ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とおい') WHERE id = '遠';  -- とお
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('えらぶ') WHERE id = '選';  -- えら
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おも', 'かさねる') WHERE id = '重';  -- おも/かさ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('ながい') WHERE id = '長';  -- なが
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('おりる', 'ふる') WHERE id = '降';  -- お/ふ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('あつまる') WHERE id = '集';  -- あつ
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('とぶ') WHERE id = '飛';  -- と
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('たべる', 'くう') WHERE id = '食';  -- た/く
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('のむ') WHERE id = '飲';  -- の
UPDATE kanji_cards SET kun_readings = JSON_ARRAY('なく') WHERE id = '鳴';  -- な
