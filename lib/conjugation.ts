import type { ConjugationForm, VerbGroup } from "./types";

/**
 * Japanese verb conjugation rule engine.
 *
 * Pure function. Operates on string tails — the same rules apply whether the
 * stem is written with kanji or kana, because conjugation touches only the
 * trailing 1-2 characters. This means `conjugate(word, ...)` and
 * `conjugate(reading, ...)` produce a parallel pair suitable for either-or
 * answer matching (via {@link conjugateAll}).
 *
 * Three rule paths:
 *   - 'ichidan' (一段):   strip trailing る, append form suffix.
 *   - 'godan'   (五段):   shift tail vowel u→{a,i,e,o} or apply 促音便 (te/ta).
 *   - 'irregular':        する · 来る (including suffix compounds like 勉強する).
 *
 * Per-verb exceptions live in VERB_EXCEPTIONS (applies only to the forms listed,
 * other forms fall through to group rules).
 */

export class ConjugationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConjugationError";
  }
}

/**
 * Per-verb exceptions. Keyed by exact stem (both kanji and kana variants must
 * be listed separately). Only listed forms are overridden; unlisted forms
 * follow the regular group rules.
 */
const VERB_EXCEPTIONS: Record<
  string,
  Partial<Record<ConjugationForm, string>>
> = {
  // 行く is godan, but て/た take 促音便 (regular く→いて/いた would give 行いて — wrong).
  "行く": { te: "行って", ta: "行った" },
  "いく": { te: "いって", ta: "いった" },
  // 問う — u-verb where て/た keep う instead of 促音便.
  "問う": { te: "問うて", ta: "問うた" },
  "とう": { te: "とうて", ta: "とうた" },
};

// ---------- godan rules -----------------------------------------------------

/**
 * For every godan tail char, the four vowel-shifted stems needed by various forms:
 *   - a: negative / causative / passive base (う → わ special case)
 *   - i: masu stem
 *   - e: potential / imperative / conditional stem
 *   - o: volitional stem
 */
const GODAN_VOWEL_SHIFT: Record<
  string,
  { a: string; i: string; e: string; o: string }
> = {
  "う": { a: "わ", i: "い", e: "え", o: "お" }, // 買う → 買わない (NOT 買あない)
  "く": { a: "か", i: "き", e: "け", o: "こ" },
  "ぐ": { a: "が", i: "ぎ", e: "げ", o: "ご" },
  "す": { a: "さ", i: "し", e: "せ", o: "そ" },
  "つ": { a: "た", i: "ち", e: "て", o: "と" },
  "ぬ": { a: "な", i: "に", e: "ね", o: "の" },
  "ぶ": { a: "ば", i: "び", e: "べ", o: "ぼ" },
  "む": { a: "ま", i: "み", e: "め", o: "も" },
  "る": { a: "ら", i: "り", e: "れ", o: "ろ" },
};

/** 促音便 / 撥音便 — godan te/ta endings per tail. */
const GODAN_TE_TA: Record<string, { te: string; ta: string }> = {
  "う": { te: "って", ta: "った" }, // 買う → 買って
  "つ": { te: "って", ta: "った" }, // 待つ → 待って
  "る": { te: "って", ta: "った" }, // 乗る → 乗って
  "く": { te: "いて", ta: "いた" }, // 書く → 書いて (EXCEPT 行く)
  "ぐ": { te: "いで", ta: "いだ" }, // 泳ぐ → 泳いで
  "す": { te: "して", ta: "した" }, // 話す → 話して
  "ぬ": { te: "んで", ta: "んだ" },
  "ぶ": { te: "んで", ta: "んだ" },
  "む": { te: "んで", ta: "んだ" }, // 読む → 読んで
};

function conjugateGodan(stem: string, form: ConjugationForm): string {
  const tail = stem.slice(-1);
  const prefix = stem.slice(0, -1);
  const v = GODAN_VOWEL_SHIFT[tail];
  if (!v) {
    throw new ConjugationError(
      `godan: stem '${stem}' ends with '${tail}', not a godan tail`,
    );
  }
  switch (form) {
    case "masu":
      return prefix + v.i + "ます";
    case "nai":
      return prefix + v.a + "ない";
    case "potential":
      return prefix + v.e + "る";
    case "volitional":
      return prefix + v.o + "う";
    case "imperative":
      return prefix + v.e;
    case "causative":
      return prefix + v.a + "せる";
    case "passive":
      return prefix + v.a + "れる";
    case "conditional":
      return prefix + v.e + "ば";
    case "te": {
      const x = GODAN_TE_TA[tail];
      if (!x) throw new ConjugationError(`godan te: tail '${tail}'`);
      return prefix + x.te;
    }
    case "ta": {
      const x = GODAN_TE_TA[tail];
      if (!x) throw new ConjugationError(`godan ta: tail '${tail}'`);
      return prefix + x.ta;
    }
  }
}

// ---------- ichidan rules ---------------------------------------------------

function conjugateIchidan(stem: string, form: ConjugationForm): string {
  if (!stem.endsWith("る")) {
    throw new ConjugationError(
      `ichidan: stem '${stem}' does not end with る`,
    );
  }
  const body = stem.slice(0, -1);
  switch (form) {
    case "masu":
      return body + "ます";
    case "te":
      return body + "て";
    case "ta":
      return body + "た";
    case "nai":
      return body + "ない";
    case "potential":
      return body + "られる";
    case "volitional":
      return body + "よう";
    case "imperative":
      return body + "ろ";
    case "causative":
      return body + "させる";
    case "passive":
      return body + "られる";
    case "conditional":
      return body + "れば";
  }
}

// ---------- irregular rules -------------------------------------------------

/**
 * Full する conjugation table. All forms are hiragana only (no kanji form exists
 * for する itself — compounds like 勉強する keep the kanji prefix).
 */
const SURU_TABLE: Record<ConjugationForm, string> = {
  masu: "します",
  te: "して",
  ta: "した",
  nai: "しない",
  potential: "できる", // truly irregular: する → できる (not しれる)
  volitional: "しよう",
  imperative: "しろ", // plain imperative; せよ is formal/literary
  causative: "させる",
  passive: "される",
  conditional: "すれば",
};

/** 来る conjugation — kanji form (for stems containing 来). */
const KURU_TABLE_KANJI: Record<ConjugationForm, string> = {
  masu: "来ます",
  te: "来て",
  ta: "来た",
  nai: "来ない",
  potential: "来られる",
  volitional: "来よう",
  imperative: "来い",
  causative: "来させる",
  passive: "来られる",
  conditional: "来れば",
};

/** 来る conjugation — kana form (for stems written くる, こない, etc.). */
const KURU_TABLE_KANA: Record<ConjugationForm, string> = {
  masu: "きます",
  te: "きて",
  ta: "きた",
  nai: "こない",
  potential: "こられる",
  volitional: "こよう",
  imperative: "こい",
  causative: "こさせる",
  passive: "こられる",
  conditional: "くれば",
};

/**
 * Conjugate an irregular verb. Handles the bare forms する / 来る / くる and
 * their suffix compounds (勉強する, 持って来る, ...). The suffix is conjugated
 * while the prefix is preserved verbatim.
 */
function conjugateIrregular(stem: string, form: ConjugationForm): string {
  // Bare する
  if (stem === "する") return SURU_TABLE[form];
  // Suffix compound ending in する (e.g. 勉強する, 電話する)
  if (stem.endsWith("する") && stem.length > 2) {
    return stem.slice(0, -2) + SURU_TABLE[form];
  }
  // Bare 来る (kanji)
  if (stem === "来る") return KURU_TABLE_KANJI[form];
  // Bare くる (kana)
  if (stem === "くる") return KURU_TABLE_KANA[form];
  // Suffix compound ending in 来る (rare: 持って来る)
  if (stem.endsWith("来る") && stem.length > 2) {
    return stem.slice(0, -2) + KURU_TABLE_KANJI[form];
  }
  // Suffix compound ending in くる (rare: もってくる)
  if (stem.endsWith("くる") && stem.length > 2) {
    return stem.slice(0, -2) + KURU_TABLE_KANA[form];
  }
  throw new ConjugationError(
    `irregular: unknown verb '${stem}' (expected する, 来る, くる, or a suffix compound)`,
  );
}

// ---------- public entry point ---------------------------------------------

/**
 * Conjugate a Japanese verb stem into the target form.
 *
 * @param stem  dictionary form, e.g. "食べる" or "たべる" or "勉強する"
 * @param group "godan" | "ichidan" | "irregular" (not_verb throws)
 * @param form  one of {@link ConjugationForm}
 * @returns     the conjugated string
 * @throws ConjugationError on empty stem, unknown group, unsupported tail, etc.
 */
export function conjugate(
  stem: string,
  group: VerbGroup,
  form: ConjugationForm,
): string {
  if (!stem || stem.length === 0) {
    throw new ConjugationError("empty stem");
  }
  if (group === "not_verb") {
    throw new ConjugationError(`not_verb cannot be conjugated: '${stem}'`);
  }

  // Per-verb exceptions override first (only listed forms).
  const exc = VERB_EXCEPTIONS[stem];
  if (exc && exc[form] !== undefined) {
    return exc[form]!;
  }

  switch (group) {
    case "godan":
      return conjugateGodan(stem, form);
    case "ichidan":
      return conjugateIchidan(stem, form);
    case "irregular":
      return conjugateIrregular(stem, form);
    default: {
      // Exhaustiveness guard — caller passed a non-VerbGroup value.
      const _exhaustive: never = group;
      throw new ConjugationError(`unknown group: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Conjugate both the kanji/mixed `word` and the canonical hiragana `reading`.
 * Returns a deduplicated set of acceptable answers — use this for answer
 * validation so the user can type either representation.
 */
export function conjugateAll(
  word: string,
  reading: string,
  group: VerbGroup,
  form: ConjugationForm,
): string[] {
  const a = conjugate(word, group, form);
  const b = conjugate(reading, group, form);
  return a === b ? [a] : [a, b];
}

// ---------- human-readable labels ------------------------------------------

export const GROUP_LABELS_JP: Record<VerbGroup, string> = {
  godan: "五段動詞",
  ichidan: "一段動詞",
  irregular: "不規則動詞",
  not_verb: "",
};

/** Korean Japanese-textbook convention: 1그룹 (godan) / 2그룹 (ichidan) / 3그룹 (irregular). */
export const GROUP_LABELS_KO: Record<VerbGroup, string> = {
  godan: "1그룹",
  ichidan: "2그룹",
  irregular: "3그룹",
  not_verb: "",
};

/** Korean labels for the target form prompt ("명령형으로"). */
export const FORM_LABELS_KO: Record<ConjugationForm, string> = {
  masu: "정중형",
  te: "て형",
  ta: "과거형",
  nai: "부정형",
  potential: "가능형",
  volitional: "의지형",
  imperative: "명령형",
  causative: "사역형",
  passive: "수동형",
  conditional: "조건형",
};

/** Japanese labels for the back-of-card display ("ます形"). */
export const FORM_LABELS_JP: Record<ConjugationForm, string> = {
  masu: "ます形",
  te: "て形",
  ta: "た形",
  nai: "ない形",
  potential: "可能形",
  volitional: "意志形",
  imperative: "命令形",
  causative: "使役形",
  passive: "受身形",
  conditional: "仮定形",
};
