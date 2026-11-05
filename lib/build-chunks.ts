/**
 * 문장 만들기(/build)용 청크 분할. 후리가나 마크업 `{漢字|かな}`을 보존한 채
 * 자연스러운 경계(조사 뒤, 읽점 뒤, 명사+です 앞)에서 자른다.
 * 불변식: chunks.join("") === 원문 (경계는 마크업 단위 사이에만 둔다).
 */
import { stripMarkup, parseMarkup } from "./jp-markup";

export const MIN_CHUNKS = 3;
export const MAX_CHUNKS = 7;

const UNIT = /\{[^|{}]+\|[^|{}]+\}|[\s\S]/gu;
// 루비 단위만 "{"로 시작한다. (서로게이트 쌍 글자는 length 2라서 length로 구분하면 안 됨)
const isRuby = (u: string) => u.startsWith("{") && u.length > 1;
const isKanji = (u: string) => isRuby(u) || /[一-鿿々]/u.test(u);
const isKata = (u: string) => /[゠-ヿ]/u.test(u);
// 한 글자 조사. 앞이 가나일 때는 단어 내부(でも, にほん…) 오탐이 적은 것만 자른다.
const PARTICLES_AFTER_ANY = "はがをにでともへの";
const PARTICLES_AFTER_KANA = "はがを";
// 정형 표현은 내부에서 자르지 않는다.
const TIME = new Set(["毎朝", "毎日", "毎晩", "毎週", "毎月", "毎年", "今日", "明日", "昨日", "今年", "来年", "去年", "今週", "来週", "先週", "今月", "来月", "先月", "今朝", "今晩", "今夜"]);
const CLOCK = new Set(["朝", "夜", "午前", "午後"]); // 뒤에 시각이 오면 붙여 둔다 (午前十時に)
const COUNTED = /^[一二三四五六七八九十百千万何]+[冊匹台回個歳人度枚本杯軒]$/u;
const NUMERAL = /^[一二三四五六七八九十百千万何]+$/u;
const rubyBase = (u: string) => (isRuby(u) ? u.slice(1, u.indexOf("|")) : "");
// 앞 조사와 한 덩어리인 연어: 앞에서 자르지 않고 끝에서 자른다.
const ATTACH = ["について", "として", "にとって", "によって"].map((w) => [...w]);
const FIXED = ["ありがとう", "ございます", "よろしく", "すみません", "おはよう", "こんにちは", "こんばんは", "いただきます", "ごちそうさま"].map((w) => [...w]);

/** 마크업 단위(루비 하나 또는 글자 하나) 사이 경계를 골라 청크로 자른다. 못 자르면 null. */
export function segmentSentence(markup: string, minChunks: number = MIN_CHUNKS): string[] | null {
  const units = markup.match(UNIT) ?? [];
  // 루비 외의 마크업 잔여물(하이라이트, 짝 없는 괄호)은 자르지 않는다.
  if (units.some((u) => !isRuby(u) && "{}|[]".includes(u))) return null;
  const n = units.length;
  const plainAt = (i: number) => (isRuby(units[i]) ? "" : units[i]);
  const cut = new Array<boolean>(n).fill(false); // cut[i]: units[i] 뒤에서 자름

  for (let i = 0; i < n - 1; i++) {
    const u = plainAt(i);
    const prev = i > 0 ? units[i - 1] : "";
    const next = plainAt(i + 1);
    if (u && "、，,。！？".includes(u)) cut[i] = true;
    // て형 뒤에 한자로 다음 어절이 시작되면 자른다 (持って|学校に)
    else if (u === "て" && i > 0 && (isKanji(units[i + 1]) || isKata(units[i + 1]))) cut[i] = true;
    else if (u && PARTICLES_AFTER_ANY.includes(u)) {
      const afterKana = !!prev && !isKanji(prev) && !isKata(prev);
      const toNo = "にでとへ".includes(u) && next === "の"; // での, への: の까지 한 덩어리
      if (!toNo && (!afterKana || PARTICLES_AFTER_KANA.includes(u))) cut[i] = true;
    }
    // から/まで/より: 직전 단위가 한자·가타카나일 때만
    const wordy = i > 0 && (isKanji(prev) || isKata(prev)) && rubyBase(prev) !== "分"; // 分から(ない)는 동사
    if (wordy && ((u === "か" && next === "ら") || (u === "ま" && next === "で") || (u === "よ" && next === "り"))) {
      // から|の → からの 로 붙이고 の 뒤에서 자른다
      cut[i + 1 < n - 1 && plainAt(i + 2) === "の" ? i + 2 : i + 1] = true;
    }
    // 시간어/수량+단위 뒤에 한자 어절이 이어지면 자른다 (毎朝|新聞を, 一冊|買います)
    const base = rubyBase(units[i]);
    if (base && isKanji(units[i + 1])) {
      const atStart = i === 0 || cut[i - 1];
      const nb = rubyBase(units[i + 1]).replace(/[時分]$/u, "");
      if (atStart && (TIME.has(base) || (CLOCK.has(base) && !NUMERAL.test(nb))) || COUNTED.test(base)) cut[i] = true;
    }
    // 명사+です/でした 앞
    if (u === "で" && (next === "す" || (next === "し" && plainAt(i + 2) === "た")) && i > 0 && (isKanji(prev) || isKata(prev))) {
      cut[i - 1] = true;
      cut[i] = false;
    }
  }
  for (const w of ATTACH)
    for (let s = 1; s + w.length <= n; s++)
      if (w.every((c, k) => plainAt(s + k) === c)) {
        for (let k = -1; k < w.length - 1; k++) cut[s + k] = false;
        cut[s + w.length - 1] = true;
      }
  cut[n - 1] = false;
  const safe = [...cut];
  for (const w of FIXED)
    for (let s = 0; s + w.length <= n; s++)
      if (w.every((c, k) => units[s + k] === c)) for (let k = 0; k < w.length - 1; k++) safe[s + k] = false;
  cut.splice(0, n, ...safe);
  // 문장 끝 기호·종조사 앞에서는 자르지 않는다 (뒤에서 앞으로 되돌림).
  for (let i = 0; i < n - 1; i++) {
    if (cut[i] && "。！？!?…ー".includes(plainAt(i + 1)) && plainAt(i + 1) !== "") cut[i] = false;
  }

  let chunks = joinByCuts(units, cut);
  // 7개 초과면 가장 짧은 인접 쌍부터 합친다.
  while (chunks.length > MAX_CHUNKS) {
    let best = 0;
    let bestLen = Infinity;
    for (let i = 0; i < chunks.length - 1; i++) {
      const len = stripMarkup(parseMarkup(chunks[i] + chunks[i + 1])).length;
      if (len < bestLen) {
        bestLen = len;
        best = i;
      }
    }
    chunks = [...chunks.slice(0, best), chunks[best] + chunks[best + 1], ...chunks.slice(best + 2)];
  }
  if (chunks.length < minChunks) return null;
  return chunks;
}

function joinByCuts(units: string[], cut: boolean[]): string[] {
  const out: string[] = [];
  let buf = "";
  units.forEach((u, i) => {
    buf += u;
    if (cut[i] || i === units.length - 1) {
      out.push(buf);
      buf = "";
    }
  });
  return out;
}

/** 순서가 달라도 이어 붙인 문자열이 원문과 같으면 정답 (같은 청크가 반복되는 문장 대응). */
export function isAssembled(chosen: readonly string[], original: readonly string[]): boolean {
  const plain = (cs: readonly string[]) => stripMarkup(parseMarkup(cs.join("")));
  return plain(chosen) === plain(original);
}
