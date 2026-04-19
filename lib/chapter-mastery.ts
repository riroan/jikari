/**
 * Chapter mastery aggregation.
 *
 * Spec (locked in /plan-eng-review 2026-04-19):
 *   mastery = (members with box ≥ 4) / (valid members count)
 *
 * Reuses existing `masteryLevel()` semantics from lib/srs.ts:138
 * ("box ≥ 4 = mastered").
 *
 * Fail-soft policy: chapter_members.cardId references that don't exist in
 * the current cards-store are EXCLUDED from the denominator. A chapter with
 * 5 stale + 5 valid members reports its mastery over the 5 valid only.
 * If all members are stale → mastery = 0 (avoids divide-by-zero).
 *
 * The mode-specific handling for grammar:
 *   grammar SRS keys are namespaced: `grammar:pattern:{id}` or
 *   `grammar:particle:{id}` (NOT `grammar:{id}`). The chapter_members
 *   table stores the bare card id, so this function infers the subtype
 *   from the card and queries the appropriate SRS key.
 */
import type { CardMode, ChapterMember, GrammarCard } from "./types";
import type { LearningState } from "./types";

/**
 * Lookup interface — components pass a getBox closure that wraps useStore.
 * Returns Leitner box 1..5, or 1 if never seen.
 */
export type GetBoxFn = (mode: CardMode, cardId: string) => LearningState["box"];

/**
 * Card existence check — returns true iff the card is in the current cards-store
 * for the given mode. Used to filter stale members from the denominator.
 */
export type CardExistsFn = (mode: CardMode, cardId: string) => boolean;

/**
 * Optional grammar-card lookup. When provided, grammar members get
 * subtyped SRS keys (`pattern:{id}` / `particle:{id}`). Without it,
 * grammar members fall back to the bare id which won't match any
 * stored learning state — chapters containing grammar will silently
 * report 0 mastery for those members.
 */
export type GrammarLookupFn = (cardId: string) => GrammarCard | undefined;

export interface ChapterMasterySummary {
  /** Number of members that resolved to a valid card. */
  validMembers: number;
  /** Number of members that were stale (excluded from denominator). */
  staleMembers: number;
  /** Number of valid members at SRS box ≥ 4. */
  masteredCount: number;
  /** masteredCount / validMembers, in [0, 1]. 0 if validMembers === 0. */
  ratio: number;
}

const MASTERY_BOX_THRESHOLD = 4;

/**
 * Compute mastery for one chapter. Pure function, no side effects.
 */
export function aggregateChapterMastery(
  members: ChapterMember[],
  cardExists: CardExistsFn,
  getBox: GetBoxFn,
  grammarLookup?: GrammarLookupFn,
): ChapterMasterySummary {
  let validMembers = 0;
  let staleMembers = 0;
  let masteredCount = 0;

  for (const member of members) {
    if (!cardExists(member.mode, member.cardId)) {
      staleMembers++;
      continue;
    }
    validMembers++;

    // Grammar SRS keys are subtyped; resolve via lookup if available.
    let srsCardId: string = member.cardId;
    if (member.mode === "grammar" && grammarLookup) {
      const gc = grammarLookup(member.cardId);
      if (gc) {
        srsCardId =
          gc.type === "pattern"
            ? `pattern:${gc.id}`
            : `particle:${gc.id}`;
      }
    }

    if (getBox(member.mode, srsCardId) >= MASTERY_BOX_THRESHOLD) {
      masteredCount++;
    }
  }

  const ratio = validMembers === 0 ? 0 : masteredCount / validMembers;
  return { validMembers, staleMembers, masteredCount, ratio };
}
