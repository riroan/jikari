/**
 * jikari 챕터 v1 정의 — single source of truth.
 *
 * Source: docs/chapters-draft.md (2026-04-19)
 * Consumer: scripts/import-chapters.ts → 0009/0010 DB tables
 *
 * Auto-mapping rules:
 *   vocab/sentence  → koreanMeanings 또는 키워드 매칭
 *   particle        → blank 입자 매칭
 *   grammar         → grammarIds 명시
 *   kanji           → kanji 글자 명시
 *
 * 한 카드가 여러 챕터에 속해도 OK — 매핑은 OR 합집합.
 */

import type { CardMode } from "@/lib/types";

export interface ChapterDef {
  id: string;
  name: string;
  intro: string | null;
  sortOrder: number;
  /** Per-mode matching rules. Empty rule = no auto-pull from that mode. */
  match: {
    /** Match vocab/sentence cards if any koreanMeanings or sentence text contains a keyword. */
    keywords?: string[];
    /** Match vocab cards by exact word (Japanese). */
    vocabWords?: string[];
    /** Match kanji cards by exact character. */
    kanji?: string[];
    /** Match sentence cards (category="vocab") by id. Useful for one-offs. */
    sentenceIds?: string[];
    /** Match sentence cards (category="particle") by `blank` particle. */
    particles?: string[];
    /** Match grammar cards by id. */
    grammarIds?: string[];
  };
}

export const CHAPTERS: ChapterDef[] = [
  // ─── A. 일상 어휘 ──────────────────────────────────────────────────────
  {
    id: "a2-food",
    name: "음식·식사",
    intro: null,
    sortOrder: 10,
    match: {
      vocabWords: [
        "ご飯", "肉", "魚", "野菜", "果物", "パン", "牛乳", "卵", "お酒",
        "料理", "牛肉", "お弁当", "昼ご飯", "晩ご飯", "茶", "飯",
      ],
      keywords: ["밥", "고기", "생선", "물고기", "야채", "채소", "과일", "빵", "우유", "달걀", "술", "요리", "쇠고기", "도시락", "점심", "저녁", "차"],
    },
  },
  {
    id: "a3-home",
    name: "집·일상 사물",
    intro: null,
    sortOrder: 20,
    match: {
      vocabWords: ["家", "部屋", "いす", "机", "窓", "傘", "紙", "電話", "時計", "台所"],
      keywords: ["집", "방", "의자", "책상", "창문", "우산", "종이", "전화", "시계", "부엌"],
    },
  },
  {
    id: "a4-transport",
    name: "교통·이동",
    intro: null,
    sortOrder: 30,
    match: {
      vocabWords: ["車", "電車", "地下鉄", "飛行機", "自転車", "空港", "駅", "道", "乗る", "行く", "来る"],
      keywords: ["자동차", "전철", "지하철", "비행기", "자전거", "공항", "역", "길", "타다", "가다", "오다"],
    },
  },
  {
    id: "a5-nature",
    name: "자연·날씨·계절",
    intro: null,
    sortOrder: 40,
    match: {
      vocabWords: ["天気", "空", "雪", "風", "海", "山", "川", "春", "夏", "秋", "冬", "色", "花"],
      keywords: ["날씨", "하늘", "눈", "바람", "바다", "산", "강", "봄", "여름", "가을", "겨울", "색", "꽃"],
    },
  },
  {
    id: "a6-adjectives",
    name: "형용사 기초 (색깔 포함)",
    intro: null,
    sortOrder: 50,
    match: {
      vocabWords: [
        "好き", "嫌い", "おいしい", "難しい", "楽しい", "近い", "遠い",
        "早い", "遅い", "明るい", "暗い", "強い", "弱い", "多い", "少ない",
        "元気", "赤い", "青い", "黄色い", "黒い", "白い", "危ない", "便利",
      ],
      // Korean 형용사 키워드도 sentence 매칭에 도움
      keywords: ["좋아하다", "싫어하다", "맛있다", "어렵다", "즐겁다", "가깝다", "멀다", "이르다", "빠르다", "늦다", "느리다", "밝다", "어둡다", "강하다", "약하다", "많다", "적다", "건강", "빨갛다", "파랗다", "노랗다", "검다", "하얗다", "위험하다", "편리"],
    },
  },
  {
    id: "a7-school",
    name: "학교·공부·일",
    intro: null,
    sortOrder: 60,
    match: {
      vocabWords: [
        "漢字", "質問", "意味", "問題", "試験", "勉強", "教室", "授業", "宿題",
        "辞書", "新聞", "約束", "返事", "紹介", "説明", "準備", "卒業",
        "経験", "研究", "会議", "注意", "意見", "仕事", "学校", "先生",
      ],
      keywords: ["한자", "질문", "의미", "뜻", "문제", "시험", "공부", "교실", "수업", "숙제", "사전", "신문", "약속", "답장", "대답", "소개", "설명", "준비", "졸업", "경험", "연구", "회의", "주의", "의견", "일", "직업", "학교", "선생님"],
    },
  },
  {
    id: "a8-action-verbs",
    name: "기본 동작 동사",
    intro: null,
    sortOrder: 70,
    match: {
      vocabWords: [
        "分かる", "知る", "会う", "持つ", "待つ", "作る", "乗る", "遊ぶ",
        "泳ぐ", "教える", "休む", "洗う", "思う", "答える", "着る",
        "考える", "始まる", "受ける", "取る", "終わる", "始める",
        "間違える", "返す", "貸す", "歌う", "見る", "食べる", "飲む",
      ],
      keywords: ["알다", "이해하다", "만나다", "들다", "가지다", "기다리다", "만들다", "타다", "놀다", "헤엄치다", "수영하다", "가르치다", "쉬다", "씻다", "생각하다", "대답하다", "입다", "고려하다", "시작되다", "받다", "잡다", "집다", "끝나다", "시작하다", "틀리다", "잘못하다", "돌려주다", "빌려주다", "노래하다"],
    },
  },

  // ─── B. 조사 (Particle) ───────────────────────────────────────────────
  {
    id: "b1-wa-ga",
    name: "は vs が (주제 vs 주어)",
    intro: null,
    sortOrder: 110,
    match: {
      particles: ["は", "が"],
      grammarIds: ["particle-wa-ga"],
    },
  },
  {
    id: "b2-ni-de-he",
    name: "に / で / へ (장소·시간·방향)",
    intro: null,
    sortOrder: 120,
    match: {
      particles: ["に", "で", "へ"],
      grammarIds: ["particle-ni-de", "particle-he-ni"],
    },
  },
  {
    id: "b3-wo-ga",
    name: "を vs が (대상·감정·가능)",
    intro: null,
    sortOrder: 130,
    match: {
      particles: ["を"],
      grammarIds: ["particle-wo-ga"],
    },
  },
  {
    id: "b4-other-particles",
    name: "기타 조사 (から·まで·より·と·も)",
    intro: null,
    sortOrder: 140,
    match: {
      particles: ["から", "まで", "より", "と", "も"],
      grammarIds: ["particle-to-ya", "particle-kara-node"],
    },
  },

  // ─── C. 문법 패턴 (Grammar) ────────────────────────────────────────────
  {
    id: "c1-polite-want-request",
    name: "정중·욕구·요청",
    intro: null,
    sortOrder: 210,
    match: {
      grammarIds: [
        "pattern-tai",
        "pattern-mashou",
        "pattern-mashou-ka",
        "pattern-te-kudasai",
        "pattern-temo-ii",
        "pattern-kata",
        "pattern-te-iru",
        "pattern-to-omou",
        "pattern-nakereba-naranai",
      ],
    },
  },
  {
    id: "c2-conditions-time",
    name: "조건·시간 (たら/ば/なら + 前に·後で·間に·ながら)",
    intro: null,
    sortOrder: 220,
    match: {
      grammarIds: [
        "pattern-tara",
        "pattern-ba",
        "pattern-nara",
        "pattern-mae-ni",
        "pattern-ato-de",
        "pattern-aida-ni",
        "pattern-nagara",
      ],
    },
  },
  {
    id: "c3-intent-guess-scope",
    name: "의도·추측·범위",
    intro: null,
    sortOrder: 230,
    match: {
      grammarIds: [
        "pattern-tsumori",
        "pattern-yotei",
        "pattern-bakari",
        "pattern-tameni",
        "pattern-youni",
        "pattern-rashii",
        "pattern-sou-appearance",
        "pattern-deshou",
        "pattern-koto-ga-dekiru",
        "pattern-kara-made",
        "pattern-yori",
        "pattern-kara-reason",
        "pattern-tewa-ikenai",
      ],
    },
  },

  // ─── E. 한자 ──────────────────────────────────────────────────────────
  {
    id: "e1-n5-direction-family",
    name: "N5 한자: 방위·가족·사람",
    intro: null,
    sortOrder: 310,
    match: {
      kanji: ["東", "西", "南", "北", "女", "男", "父", "母", "子", "兄", "姉", "弟", "妹", "友"],
    },
  },
  {
    id: "e2-n5-action-comm",
    name: "N5 한자: 일상 동작·소통",
    intro: null,
    sortOrder: 320,
    match: {
      kanji: ["食", "飲", "見", "行", "来", "会", "出", "入", "立", "休", "聞", "読", "話", "言", "語", "書"],
    },
  },
  {
    id: "e3-n5-school-place",
    name: "N5 한자: 학교·장소·기본",
    intro: null,
    sortOrder: 330,
    match: {
      kanji: ["学", "校", "生", "先", "国", "外", "駅", "道", "社", "新", "古", "高", "安", "長", "白", "黒", "気", "円", "電"],
    },
  },
  {
    id: "e4-n4-body-action",
    name: "N4 한자: 신체·일상 동작",
    intro: null,
    sortOrder: 340,
    match: {
      // 신체 + 동작 + 의료 (50자 큰 단위)
      kanji: [
        "体", "頭", "顔", "心", "歩", "走", "乗", "起", "寝", "売", "買",
        "勉", "思", "考", "持", "着", "答", "問", "自", "主",
        "医", "院", "病", "切", "返", "貸", "借",
        "立", "受", "取", "始", "終", "止", "続",
        "入", "出", "上", "下", "前", "後", "右", "左",
        "使", "作", "送", "呼", "押", "引",
      ],
    },
  },
  {
    id: "e5-n4-culture-life",
    name: "N4 한자: 문화·생활·음식",
    intro: null,
    sortOrder: 350,
    match: {
      kanji: [
        "歌", "映", "画", "館", "図", "音", "楽", "料", "理",
        "茶", "飯", "肉", "魚", "店", "家", "族", "親", "牛", "鳥",
        "服", "靴", "野", "菜", "果", "水", "薬", "卵",
        "夫", "妻", "弟", "姉", "妹", "兄", "両", "子",
        "趣", "味", "祭", "好", "美", "歩", "旅",
      ],
    },
  },
  {
    id: "e6-n4-abstract-time",
    name: "N4 한자: 추상·자연·시간",
    intro: null,
    sortOrder: 360,
    match: {
      kanji: [
        "字", "文", "事", "物", "題", "所", "地", "鉄",
        "時", "間", "日", "月", "年", "曜", "週", "朝", "昼", "夜",
        "春", "夏", "秋", "冬", "雪", "風", "海", "山", "川", "雨",
        "数", "度", "回", "色", "近", "遠", "多", "少", "強", "弱",
        "明", "暗", "重", "軽", "広", "狭", "深", "浅", "暑", "寒", "正",
      ],
    },
  },
];
