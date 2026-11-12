/**
 * 소리 구별(최소쌍) — 한국어 화자가 귀로 놓치기 쉬운 네 가지 차이만 다른 실제 단어 쌍.
 * 듣기 탭에서 둘 중 하나를 들려주고 어느 쪽인지 고르게 한다. TTS는 `kana`를 읽는다
 * (한자를 넘기면 家→うち처럼 다른 읽기로 읽을 수 있어서).
 */
export type PairKind = "long" | "sokuon" | "voicing" | "youon";

export const PAIR_KIND_KO: Record<PairKind, string> = {
  long: "장음",
  sokuon: "촉음(っ)",
  voicing: "청음·탁음",
  youon: "요음",
};

export interface PairWord {
  kana: string;
  /** 표기 (한자 섞임) — 정답 공개 때만 보여 준다. */
  word: string;
  ko: string;
}

export interface MinimalPair {
  id: string;
  kind: PairKind;
  a: PairWord;
  b: PairWord;
}

const w = (kana: string, word: string, ko: string): PairWord => ({ kana, word, ko });
const p = (id: string, kind: PairKind, a: PairWord, b: PairWord): MinimalPair => ({ id, kind, a, b });

export const MINIMAL_PAIRS: readonly MinimalPair[] = [
  // 장음 — 길게 끄는 소리가 한 박자다.
  p("obasan", "long", w("おばさん", "おばさん", "아주머니"), w("おばあさん", "おばあさん", "할머니")),
  p("ojisan", "long", w("おじさん", "おじさん", "아저씨"), w("おじいさん", "おじいさん", "할아버지")),
  p("koko", "long", w("ここ", "ここ", "여기"), w("こうこう", "高校", "고등학교")),
  p("yuki", "long", w("ゆき", "雪", "눈"), w("ゆうき", "勇気", "용기")),
  p("tori", "long", w("とり", "鳥", "새"), w("とおり", "通り", "길, 거리")),
  p("heya", "long", w("へや", "部屋", "방"), w("へいや", "平野", "평야")),
  p("kuki", "long", w("くき", "茎", "줄기"), w("くうき", "空気", "공기")),
  p("ie", "long", w("いえ", "家", "집"), w("いいえ", "いいえ", "아니요")),
  p("seki", "long", w("せき", "席", "자리"), w("せいき", "世紀", "세기")),
  p("suji", "long", w("すじ", "筋", "줄거리, 힘줄"), w("すうじ", "数字", "숫자")),
  p("yoyaku", "long", w("よやく", "予約", "예약"), w("ようやく", "ようやく", "겨우, 드디어")),
  p("kare", "long", w("かれ", "彼", "그 (사람)"), w("カレー", "カレー", "카레")),
  // 촉음 — っ도 한 박자 쉬는 소리.
  p("kite", "sokuon", w("きて", "来て", "와 (줘)"), w("きって", "切手", "우표")),
  p("ita", "sokuon", w("いた", "いた", "있었다"), w("いった", "行った", "갔다")),
  p("kako", "sokuon", w("かこ", "過去", "과거"), w("かっこ", "括弧", "괄호")),
  p("oto", "sokuon", w("おと", "音", "소리"), w("おっと", "夫", "남편")),
  p("saka", "sokuon", w("さか", "坂", "언덕"), w("さっか", "作家", "작가")),
  p("shikaku", "sokuon", w("しかく", "四角", "사각형"), w("しっかく", "失格", "실격")),
  p("ichi", "sokuon", w("いち", "一", "1"), w("いっち", "一致", "일치")),
  p("buka", "sokuon", w("ぶか", "部下", "부하"), w("ぶっか", "物価", "물가")),
  p("saki", "sokuon", w("さき", "先", "앞, 먼저"), w("さっき", "さっき", "아까")),
  p("neko", "sokuon", w("ねこ", "猫", "고양이"), w("ねっこ", "根っこ", "뿌리")),
  // 청음·탁음 — 한국어엔 어두 탁음이 없어 か/が, た/だ가 가장 헷갈린다.
  p("kagaku", "voicing", w("かがく", "科学", "과학"), w("かかく", "価格", "가격")),
  p("tenki", "voicing", w("てんき", "天気", "날씨"), w("でんき", "電気", "전기")),
  p("kin", "voicing", w("きん", "金", "금"), w("ぎん", "銀", "은")),
  p("daigaku", "voicing", w("たいがく", "退学", "퇴학"), w("だいがく", "大学", "대학")),
  p("gakkou", "voicing", w("かっこう", "格好", "모습, 차림"), w("がっこう", "学校", "학교")),
  p("kouka", "voicing", w("こうか", "効果", "효과"), w("ごうか", "豪華", "호화")),
  p("kankoku", "voicing", w("かんこく", "韓国", "한국"), w("かんごく", "監獄", "감옥")),
  p("kagi", "voicing", w("かき", "柿", "감"), w("かぎ", "鍵", "열쇠")),
  p("tango", "voicing", w("たんご", "単語", "단어"), w("だんご", "団子", "경단")),
  p("futa", "voicing", w("ふた", "蓋", "뚜껑"), w("ぶた", "豚", "돼지")),
  p("shintai", "voicing", w("しんたい", "身体", "신체"), w("しんだい", "寝台", "침대")),
  p("saru", "voicing", w("さる", "猿", "원숭이"), w("ざる", "ざる", "소쿠리")),
  // 요음 — きょ는 한 박자, きよ는 두 박자.
  p("byouin", "youon", w("びょういん", "病院", "병원"), w("びよういん", "美容院", "미용실")),
  p("jiyuu", "youon", w("じゅう", "十", "10"), w("じゆう", "自由", "자유")),
  p("kyou", "youon", w("きょう", "今日", "오늘"), w("きよう", "器用", "손재주가 좋음")),
  p("ryou", "youon", w("りょう", "量", "양"), w("りよう", "利用", "이용")),
  p("kyaku", "youon", w("きゃく", "客", "손님"), w("きやく", "規約", "규약")),
  p("ryuu", "youon", w("りゅう", "竜", "용"), w("りゆう", "理由", "이유")),
  p("hyaku", "youon", w("ひゃく", "百", "100"), w("ひやく", "飛躍", "비약")),
];

export const pairById = new Map(MINIMAL_PAIRS.map((x) => [x.id, x]));
