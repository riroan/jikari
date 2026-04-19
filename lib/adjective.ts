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
    case "conditional":
      return body + "ければ";
    case "polite_negative":
      // Colloquial-polite chosen as primary; textbook 〜くありません added as
      // an accepted alternate in conjugateAdjAll.
      return body + "くないです";
    case "ni_adv":
    case "na_prenominal":
      throw new AdjectiveConjugationError(
        `i-adj does not have ${form} form (stem '${stem}')`,
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
    case "ni_adv":
      return stem + "に";
    case "conditional":
      return stem + "なら";
    case "polite_negative":
      // Textbook-formal chosen as primary; じゃないです / ではありません /
      // ではないです added as accepted alternates in conjugateAdjAll.
      return stem + "じゃありません";
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
    } else if (form === "polite_negative") {
      // Primary is 〜じゃありません. Accept the other three register×politeness
      // permutations too — they're all valid daily-speech polite negatives.
      for (const stem of [word, reading]) {
        out.add(stem + "じゃないです");
        out.add(stem + "ではありません");
        out.add(stem + "ではないです");
      }
    }
  }

  // I-adj: polite_negative has a textbook alternate 〜くありません.
  if (group === "i_adj" && form === "polite_negative") {
    for (const stem of [word, reading]) {
      try {
        const body = iAdjBody(stem);
        out.add(body + "くありません");
      } catch {
        // Unreachable on valid stems; conjugateAdj above would have already
        // thrown. Swallow to avoid leaking a second error path from the
        // alternates branch.
      }
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
  ni_adv: "부사형",
  conditional: "조건형",
  polite_negative: "정중부정형",
};

/** Japanese labels for back-of-card display. */
export const ADJ_FORM_LABELS_JP: Record<AdjectiveForm, string> = {
  negative: "否定形",
  past: "過去形",
  past_negative: "過去否定形",
  te: "て形",
  // i_adv (〜く) and ni_adv (〜に) are both 連用形 in traditional grammar;
  // they never co-occur on one card (ADJ_FORMS_FOR splits by group).
  i_adv: "連用形",
  ni_adv: "連用形",
  na_prenominal: "連体形",
  conditional: "条件形",
  polite_negative: "丁寧否定形",
};
