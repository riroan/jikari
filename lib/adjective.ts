import type { AdjectiveForm, AdjGroup } from "./types";

/**
 * Japanese adjective conjugation rule engine.
 *
 * Pure function. Like the verb `conjugate`, this operates on string tails —
 * kanji and kana forms conjugate in parallel except for two exceptions
 * (all-kana いい → stem よ, all-kana ない has special negative/past).
 *
 * Two groups:
 *   い-adjective: strip trailing い, append form suffix.
 *     big-いい irregularity handled explicitly.
 *   な-adjective: dictionary form is bare (好き, 元気). Append form suffix.
 *     Negative accepts both じゃ/では registers via {@link conjugateAdjAll}.
 */

export class AdjectiveConjugationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdjectiveConjugationError";
  }
}

// ---------- i-adj -----------------------------------------------------------

/**
 * Handle the いい irregularity: bare form "いい" (all kana) conjugates as
 * though the stem were "よい". Kanji form 良い uses regular stripping (良 + く…)
 * and produces the same surface as よ-stem.
 *
 * Returns the body to append form suffixes to. Throws on non-い-ending input.
 */
function iAdjBody(stem: string): string {
  if (stem === "いい") return "よ";
  if (!stem.endsWith("い")) {
    throw new AdjectiveConjugationError(
      `i-adj: stem '${stem}' does not end with い`,
    );
  }
  return stem.slice(0, -1);
}

function conjugateIAdj(stem: string, form: AdjectiveForm): string {
  const body = iAdjBody(stem);
  switch (form) {
    case "negative":
      return body + "くない";
    case "past":
      return body + "かった";
    case "past_negative":
      return body + "くなかった";
    case "te":
      return body + "くて";
    case "i_adv":
      return body + "く";
    case "na_prenominal":
      throw new AdjectiveConjugationError(
        `i-adj does not have na_prenominal form (stem '${stem}')`,
      );
  }
}

// ---------- na-adj ----------------------------------------------------------

/**
 * Primary (casual) conjugation of a na-adjective.
 * Alternate formal 〜では forms are covered by {@link conjugateAdjAll}.
 */
function conjugateNaAdj(stem: string, form: AdjectiveForm): string {
  switch (form) {
    case "negative":
      return stem + "じゃない";
    case "past":
      return stem + "だった";
    case "past_negative":
      return stem + "じゃなかった";
    case "te":
      return stem + "で";
    case "na_prenominal":
      return stem + "な";
    case "i_adv":
      throw new AdjectiveConjugationError(
        `na-adj does not have i_adv form (stem '${stem}')`,
      );
  }
}

// ---------- public entry points --------------------------------------------

/**
 * Conjugate an adjective stem into the target form.
 * @throws AdjectiveConjugationError on invalid group/form combos or empty stem.
 */
export function conjugateAdj(
  stem: string,
  group: AdjGroup,
  form: AdjectiveForm,
): string {
  if (!stem || stem.length === 0) {
    throw new AdjectiveConjugationError("empty stem");
  }
  if (group === "not_adj") {
    throw new AdjectiveConjugationError(
      `not_adj cannot be conjugated: '${stem}'`,
    );
  }
  return group === "i_adj"
    ? conjugateIAdj(stem, form)
    : conjugateNaAdj(stem, form);
}

/**
 * All acceptable answers for the given `(word, reading, group, form)`.
 *
 * - Runs the rule on BOTH word (kanji) and reading (hiragana) sides.
 * - For na-adj negative/past_negative: also includes the formal では variants
 *   alongside the casual じゃ variants. Both are correct in different registers.
 * - Deduplicates the result.
 */
export function conjugateAdjAll(
  word: string,
  reading: string,
  group: AdjGroup,
  form: AdjectiveForm,
): string[] {
  const primary = conjugateAdj(word, group, form);
  const reading_primary = conjugateAdj(reading, group, form);

  const out = new Set<string>([primary, reading_primary]);

  // Na-adj: add formal 〜では variants alongside casual 〜じゃ.
  if (group === "na_adj") {
    if (form === "negative") {
      out.add(word + "ではない");
      out.add(reading + "ではない");
    } else if (form === "past_negative") {
      out.add(word + "ではなかった");
      out.add(reading + "ではなかった");
    }
  }

  return [...out];
}

// ---------- human-readable labels ------------------------------------------

export const ADJ_GROUP_LABELS_KO: Record<AdjGroup, string> = {
  i_adj: "い형용사",
  na_adj: "な형용사",
  not_adj: "",
};

export const ADJ_GROUP_LABELS_JP: Record<AdjGroup, string> = {
  i_adj: "い形容詞",
  na_adj: "な形容詞",
  not_adj: "",
};

/** Korean prompt labels ("부정형으로", "て형으로"). */
export const ADJ_FORM_LABELS_KO: Record<AdjectiveForm, string> = {
  negative: "부정형",
  past: "과거형",
  past_negative: "과거부정형",
  te: "て형",
  i_adv: "부사형",
  na_prenominal: "명사수식형",
};

/** Japanese labels for back-of-card display. */
export const ADJ_FORM_LABELS_JP: Record<AdjectiveForm, string> = {
  negative: "否定形",
  past: "過去形",
  past_negative: "過去否定形",
  te: "て形",
  i_adv: "連用形",
  na_prenominal: "連体形",
};
