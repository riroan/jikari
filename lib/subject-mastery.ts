import { masteryLevel } from "./srs";
import type { CardMode, LearningState } from "./types";

export type SubjectMastery = { total: number; mastered: number; learning: number; fresh: number };

/** Per-subject mastered (box ≥ 4) / learning / never-reviewed counts over a card-id pool. */
export function subjectMastery(
  states: Record<string, LearningState>,
  mode: CardMode,
  poolIds: readonly string[],
): SubjectMastery {
  const m: SubjectMastery = { total: poolIds.length, mastered: 0, learning: 0, fresh: 0 };
  for (const id of poolIds) {
    const lvl = masteryLevel(states[`${mode}:${id}`]);
    if (lvl === "mastered") m.mastered++;
    else if (lvl === "learning") m.learning++;
    else m.fresh++;
  }
  return m;
}
