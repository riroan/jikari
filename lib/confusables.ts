/**
 * 헷갈리는 쌍 대조 — static contrast notes for near-equivalent grammar
 * patterns and particles. Keyed by grammar card id ("grammar") or by the
 * blanked particle ("particle"). Same shape of data as lib/particle-info.ts.
 *
 * Examples mark the contrasted part with [[ ]] (rendered by RubyText) and stay
 * inside 常用漢字. Pairs flagged REVIEW are the ones whose Korean wording or
 * nuance deserves a second look from a native/advanced reader.
 */

export type ConfusableKind = "grammar" | "particle";

export interface ConfusableSide {
  /** grammar card id, or the particle character */
  ref: string;
  /** Short heading shown on the row, e.g. "〜ために" */
  label: string;
  /** One-line Korean difference */
  diff: string;
  /** Tiny example, contrasted part in [[ ]] */
  jp: string;
  ko: string;
}

export interface ConfusablePair {
  kind: ConfusableKind;
  a: ConfusableSide;
  b: ConfusableSide;
}

const g = (a: ConfusableSide, b: ConfusableSide): ConfusablePair => ({ kind: "grammar", a, b });
const p = (a: ConfusableSide, b: ConfusableSide): ConfusablePair => ({ kind: "particle", a, b });

export const CONFUSABLES: ConfusablePair[] = [
  // ---- grammar patterns ----
  g(
    { ref: "pattern-tameni", label: "〜ために", diff: "스스로 하는 행동의 목적. 앞뒤 주어가 같고, 의지로 하는 동사가 옴.", jp: "日本へ行く[[ために]]、お金をためる。", ko: "일본에 가기 위해 돈을 모은다." },
    { ref: "pattern-youni", label: "〜ように", diff: "어떤 상태·결과가 되기를 바라는 목적. 가능형·부정형·무의지 동사가 옴.", jp: "わすれない[[ように]]、メモします。", ko: "잊지 않도록 메모해요." },
  ),
  // REVIEW: ば の 뒤 제약("명령·의지가 어색")은 완화해서 표현함
  g(
    { ref: "pattern-ba", label: "〜ば", diff: "일반적·필연적인 조건('~하면 (으레) ~다'). 뒤에 의지·명령은 어색해지기 쉬움.", jp: "春になれ[[ば]]、花がさきます。", ko: "봄이 되면 꽃이 펴요." },
    { ref: "pattern-tara", label: "〜たら", diff: "개인적인 가정, '~한 뒤에'. 뒤에 부탁·의지·명령을 자유롭게 쓸 수 있음.", jp: "時間があっ[[たら]]、来てください。", ko: "시간이 있으면 와 주세요." },
  ),
  // REVIEW: なら = 상대 발언·상황을 받는 '그렇다면' 용법만 강조
  g(
    { ref: "pattern-tara", label: "〜たら", diff: "일이 일어난 뒤의 행동. '~하면(~하고 나서)'.", jp: "駅に着い[[たら]]、電話してください。", ko: "역에 도착하면 전화해 주세요." },
    { ref: "pattern-nara", label: "〜なら", diff: "상대의 말이나 상황을 받아 '그렇다면'. 조언·판단이 뒤따름.", jp: "駅へ行く[[なら]]、あの道が近いですよ。", ko: "역에 갈 거면 저 길이 가까워요." },
  ),
  g(
    { ref: "pattern-mae-ni", label: "〜前に", diff: "동사 기본형에 붙음. 시제와 상관없이 항상 기본형.", jp: "ねる[[前に]]、歯をみがきます。", ko: "자기 전에 이를 닦아요." },
    { ref: "pattern-ato-de", label: "〜後で", diff: "동사 た형에 붙음. 앞 동작이 끝난 뒤.", jp: "食べた[[後で]]、薬をのみます。", ko: "먹은 뒤에 약을 먹어요." },
  ),
  g(
    { ref: "pattern-aida-ni", label: "〜間に", diff: "계속되는 기간 '동안에' 어떤 일이 한 번 일어남.", jp: "子どもがねている[[間に]]、買い物をします。", ko: "아이가 자는 동안에 장을 봐요." },
    { ref: "pattern-nagara", label: "〜ながら", diff: "같은 사람이 두 동작을 동시에 함. 뒤가 주된 동작.", jp: "音楽をき[[ながら]]、歩きます。", ko: "음악을 들으면서 걸어요." },
  ),
  g(
    { ref: "pattern-nagara", label: "〜ながら", diff: "두 동작을 동시에 함. 한쪽은 곁들이는 동작.", jp: "テレビを見[[ながら]]、ごはんを食べる。", ko: "TV를 보면서 밥을 먹는다." },
    { ref: "pattern-te-iru", label: "〜ている", diff: "한 동작의 진행 중, 또는 결과가 이어지는 상태.", jp: "いま、ごはんを食べて[[いる]]。", ko: "지금 밥을 먹고 있다." },
  ),
  g(
    { ref: "pattern-tai", label: "〜たい", diff: "지금 느끼는 바람. '하고 싶다'(주로 말하는 사람 본인).", jp: "すしが食べ[[たい]]です。", ko: "초밥이 먹고 싶어요." },
    { ref: "pattern-tsumori", label: "〜つもり", diff: "이미 마음먹은 계획·의도. '할 작정'.", jp: "来月、国へ帰る[[つもり]]です。", ko: "다음 달에 고향에 돌아갈 생각이에요." },
  ),
  // REVIEW: 予定 설명(주변 일정·공적 계획에도 쓰임)
  g(
    { ref: "pattern-tsumori", label: "〜つもり", diff: "말하는 사람의 의향. 내가 그렇게 하려고 마음먹음.", jp: "あした、友だちに会う[[つもり]]です。", ko: "내일 친구를 만날 생각이에요." },
    { ref: "pattern-yotei", label: "〜予定", diff: "정해진 일정·계획. 남의 일정이나 공적인 일에도 씀.", jp: "会議は三時からの[[予定]]です。", ko: "회의는 3시부터 예정이에요." },
  ),
  // REVIEW: でしょう 설명(객관적 예측·올려 말하면 확인)
  g(
    { ref: "pattern-to-omou", label: "〜と思う", diff: "'나는 ~라고 생각한다'. 내 의견임을 분명히 함.", jp: "あしたは雨だ[[と思います]]。", ko: "내일은 비가 올 거라고 생각해요." },
    { ref: "pattern-deshou", label: "〜でしょう", diff: "'~일 거예요'. 정보에 근거한 추량. 끝을 올리면 '~죠?' 확인.", jp: "あしたは雨[[でしょう]]。", ko: "내일은 비가 오겠죠." },
  ),
  // REVIEW: らしい = 전언·들은 근거 추정
  g(
    { ref: "pattern-deshou", label: "〜でしょう", diff: "말하는 사람이 짐작함('아마 ~일 거다').", jp: "田中さんは来ない[[でしょう]]。", ko: "다나카 씨는 안 오겠죠." },
    { ref: "pattern-rashii", label: "〜らしい", diff: "듣거나 읽은 정보에 근거한 판단. '~라고 한다, ~인 모양이다'.", jp: "田中さんは来ない[[らしい]]です。", ko: "다나카 씨는 안 온대요." },
  ),
  g(
    { ref: "pattern-rashii", label: "〜らしい", diff: "들은 정보·평판이 근거. 직접 본 게 아님.", jp: "この店は人気がある[[らしい]]です。", ko: "이 가게는 인기가 있대요." },
    { ref: "pattern-sou-appearance", label: "〜そう", diff: "눈앞에서 본 모습으로 느낌. '~해 보인다'.", jp: "このケーキ、おいし[[そう]]ですね。", ko: "이 케이크 맛있어 보이네요." },
  ),
  g(
    { ref: "pattern-mashou", label: "〜ましょう", diff: "함께 하자고 권유하거나 제안함. 평서문.", jp: "いっしょに行き[[ましょう]]。", ko: "같이 가요." },
    { ref: "pattern-mashou-ka", label: "〜ましょうか", diff: "'~할까요?'. 상대에게 물으며 제안·도움을 제의함.", jp: "手伝い[[ましょうか]]。", ko: "도와드릴까요?" },
  ),
  g(
    { ref: "pattern-mashou", label: "〜ましょう", diff: "'~합시다'. 나도 함께 하자는 권유.", jp: "ここで休み[[ましょう]]。", ko: "여기서 쉬어요." },
    { ref: "pattern-te-kudasai", label: "〜てください", diff: "'~해 주세요'. 상대에게 해 달라는 부탁.", jp: "ここにすわって[[ください]]。", ko: "여기에 앉아 주세요." },
  ),
  g(
    { ref: "pattern-temo-ii", label: "〜てもいい", diff: "허가. '~해도 된다'.", jp: "ここで写真をとっ[[てもいい]]です。", ko: "여기서 사진을 찍어도 돼요." },
    { ref: "pattern-tewa-ikenai", label: "〜てはいけない", diff: "금지. '~하면 안 된다'.", jp: "ここでたばこをすっ[[てはいけません]]。", ko: "여기서 담배를 피우면 안 돼요." },
  ),
  g(
    { ref: "pattern-tewa-ikenai", label: "〜てはいけない", diff: "금지. 하는 것이 안 됨.", jp: "学校でねて[[はいけません]]。", ko: "학교에서 자면 안 돼요." },
    { ref: "pattern-nakereba-naranai", label: "〜なければならない", diff: "의무. 하지 않으면 안 됨, 곧 '해야 한다'.", jp: "薬をのまなけれ[[ばなりません]]。", ko: "약을 먹어야 해요." },
  ),
  g(
    { ref: "pattern-kara-reason", label: "〜から(이유)", diff: "문장 뒤에 붙어 '~니까'. 이유를 말함.", jp: "あつい[[から]]、窓をあけます。", ko: "더우니까 창문을 열어요." },
    { ref: "pattern-kara-made", label: "〜から〜まで", diff: "명사 뒤에서 시작점. 끝나는 점이 まで.", jp: "九時[[から]]五時[[まで]]はたらく。", ko: "9시부터 5시까지 일한다." },
  ),
  g(
    { ref: "pattern-bakari", label: "〜たばかり", diff: "방금 막 끝남. 직후라는 느낌.", jp: "いま、起きた[[ばかり]]です。", ko: "지금 막 일어났어요." },
    { ref: "pattern-ato-de", label: "〜後で", diff: "순서만 말함. 앞 일이 끝난 뒤.", jp: "ふろに入った[[後で]]、ねます。", ko: "목욕한 뒤에 자요." },
  ),

  // ---- particles (keyed by blanked particle) ----
  p(
    { ref: "は", label: "は", diff: "이미 화제가 된 것. '~은/는', 다른 것과 대비.", jp: "田中さん[[は]]学生です。", ko: "다나카 씨는 학생이에요." },
    { ref: "が", label: "が", diff: "새로 알리는 주어, 의문사의 주어. '누가/무엇이'에 초점.", jp: "だれ[[が]]来ましたか。", ko: "누가 왔어요?" },
  ),
  p(
    { ref: "に", label: "に", diff: "있는 곳(ある·いる), 도착점, 시각.", jp: "公園[[に]]犬がいます。", ko: "공원에 개가 있어요." },
    { ref: "で", label: "で", diff: "동작이 일어나는 장소, 수단.", jp: "公園[[で]]あそびます。", ko: "공원에서 놀아요." },
  ),
  p(
    { ref: "を", label: "を", diff: "동작의 대상. 타동사의 목적어.", jp: "テレビ[[を]]見ます。", ko: "TV를 봐요." },
    { ref: "が", label: "が", diff: "好き·わかる·できる 같은 감정·능력의 대상.", jp: "ねこ[[が]]すきです。", ko: "고양이를 좋아해요." },
  ),
  // REVIEW: へ=방향 / に=도달점 구분은 현대어에서 겹침
  p(
    { ref: "へ", label: "へ", diff: "향하는 방향. '~쪽으로'.", jp: "駅[[へ]]むかいます。", ko: "역 쪽으로 향해요." },
    { ref: "に", label: "に", diff: "도착하는 지점. 着く처럼 도달을 말할 때는 に.", jp: "駅[[に]]着きました。", ko: "역에 도착했어요." },
  ),
  p(
    { ref: "と", label: "と", diff: "나열한 것이 전부. 그것만.", jp: "りんご[[と]]みかんを買いました。", ko: "사과와 귤을 샀어요." },
    { ref: "や", label: "や", diff: "예를 든 것. 그 밖에도 있음('~나 ~ 같은 것').", jp: "りんご[[や]]みかんを買いました。", ko: "사과나 귤 같은 걸 샀어요." },
  ),
  p(
    { ref: "は", label: "は", diff: "화제를 제시하거나 다른 것과 대비.", jp: "わたし[[は]]行きます。", ko: "저는 가요." },
    { ref: "も", label: "も", diff: "앞과 같은 것을 더함. '~도'.", jp: "田中さん[[も]]行きます。", ko: "다나카 씨도 가요." },
  ),
  p(
    { ref: "ね", label: "ね", diff: "상대와 공감·확인. '~네요, ~죠'.", jp: "いい天気です[[ね]]。", ko: "날씨 좋네요." },
    { ref: "よ", label: "よ", diff: "상대가 모르는 것을 알려 줌. '~요, ~거든요'.", jp: "あの店は安い[[よ]]。", ko: "저 가게 싸요." },
  ),
];

export interface ConfusableView {
  self: ConfusableSide;
  other: ConfusableSide;
}

/** First pair containing `ref`, oriented so the card's own side comes first. */
export function confusableFor(kind: ConfusableKind, ref: string): ConfusableView | null {
  for (const pair of CONFUSABLES) {
    if (pair.kind !== kind) continue;
    if (pair.a.ref === ref) return { self: pair.a, other: pair.b };
    if (pair.b.ref === ref) return { self: pair.b, other: pair.a };
  }
  return null;
}
