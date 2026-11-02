import type { LearningState } from "./types";

/** Days the overdue backlog can be spread over (dialog choices). */
export const RESPACE_DAYS = [7, 14, 30] as const;

export const UNDO_KEY = "jikari-respace-undo-v1";

/** cardKey → nextDue to apply. Only nextDue ever changes. */
export type NextDueChanges = Record<string, number>;

function startOfLocalDay(now: number, plusDays: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + plusDays).getTime();
}

/**
 * Re-space overdue reviewed cards (nextDue <= now) over the next `days` days.
 * Oldest-due first (tie: lower box, then key) fills day 0 up to `goal`, the rest
 * is split evenly over days 1..days-1. Day-0 cards keep their nextDue (already
 * due today) so nothing moves earlier and a second run is a no-op.
 * Day d >= 1 cards get local start-of-day d + their index in seconds (keeps order).
 */
export function planRespace(
  states: Record<string, LearningState>,
  now: number,
  days: number,
  goal: number,
): { changes: NextDueChanges; overdue: number; perDay: number[] } {
  const overdue = Object.values(states)
    .filter((s) => s.lastReviewed > 0 && s.nextDue <= now)
    .sort(
      (a, b) =>
        a.nextDue - b.nextDue || a.box - b.box || (a.cardKey < b.cardKey ? -1 : 1),
    );
  const total = overdue.length;
  const perDay = new Array<number>(days).fill(0);
  const changes: NextDueChanges = {};
  const day0 = Math.min(total, goal);
  perDay[0] = day0;
  const rest = total - day0;
  const per = days > 1 ? Math.ceil(rest / (days - 1)) : 0;
  let day = 1;
  let used = 0;
  overdue.forEach((s, i) => {
    if (i < day0) return;
    if (used === per) {
      day++;
      used = 0;
    }
    changes[s.cardKey] = startOfLocalDay(now, day) + used * 1000;
    perDay[day]++;
    used++;
  });
  return { changes, overdue: total, perDay };
}

export interface UndoSnapshot {
  appliedAt: number;
  /** [cardKey, previous nextDue, applied nextDue] */
  entries: [string, number, number][];
}

export function buildUndo(
  states: Record<string, LearningState>,
  changes: NextDueChanges,
  appliedAt: number,
): UndoSnapshot {
  return {
    appliedAt,
    entries: Object.entries(changes).map(([k, to]) => [k, states[k].nextDue, to]),
  };
}

/** Restore only cards untouched since: not reviewed after apply and nextDue still the applied one. */
export function planUndo(
  states: Record<string, LearningState>,
  snap: UndoSnapshot,
): NextDueChanges {
  const out: NextDueChanges = {};
  for (const [k, prev, applied] of snap.entries) {
    const s = states[k];
    if (s && s.lastReviewed <= snap.appliedAt && s.nextDue === applied) out[k] = prev;
  }
  return out;
}

export function saveUndo(snap: UndoSnapshot): boolean {
  try {
    localStorage.setItem(UNDO_KEY, JSON.stringify(snap));
    return true;
  } catch {
    return false;
  }
}

export function loadUndo(): UndoSnapshot | null {
  try {
    const raw = localStorage.getItem(UNDO_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as UndoSnapshot;
    return typeof p?.appliedAt === "number" && Array.isArray(p.entries) ? p : null;
  } catch {
    return null;
  }
}

export function clearUndo(): void {
  try {
    localStorage.removeItem(UNDO_KEY);
  } catch {
    /* ignore */
  }
}
