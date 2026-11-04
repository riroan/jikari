/**
 * 백업 파일의 선택적 `extras` 섹션: 기기 로컬(localStorage) 데이터.
 * PersistedState/서버 스키마와 무관 — 없거나 깨져 있어도 본 백업 가져오기는 영향받지 않는다.
 */
import { loadMemos, normalizeMemos, saveMemos, type Memo } from "./memos";
import { loadMisses, normalizeMisses, saveMisses, type Miss } from "./misses";
import { loadWeak, saveWeak } from "./reading";

export const EXTRAS_VERSION = 1;
const WEAK_CAP = 2000;

export interface BackupExtras {
  v: number;
  misses?: Miss[];
  memos?: Memo[];
  readingWeak?: string[];
}

export function collectExtras(): BackupExtras {
  return { v: EXTRAS_VERSION, misses: loadMisses(), memos: loadMemos(), readingWeak: [...loadWeak()] };
}

/** 절대 throw하지 않는다. 알 수 없는 버전/형식이면 undefined, 일부 필드만 깨졌으면 나머지만. */
export function parseExtras(raw: unknown): BackupExtras | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const e = raw as Record<string, unknown>;
  if (e.v !== EXTRAS_VERSION) return undefined;
  const out: BackupExtras = { v: EXTRAS_VERSION };
  if (Array.isArray(e.misses)) out.misses = normalizeMisses(e.misses);
  if (Array.isArray(e.memos)) out.memos = normalizeMemos(e.memos);
  if (Array.isArray(e.readingWeak))
    out.readingWeak = e.readingWeak
      .filter((x): x is string => typeof x === "string" && x.length <= 64)
      .slice(0, WEAK_CAP);
  return out;
}

/** 있는 필드만 덮어쓴다(없으면 현재 기기 값 유지). */
export function applyExtras(x: BackupExtras | undefined): void {
  if (!x) return;
  if (x.misses) saveMisses(x.misses);
  if (x.memos) saveMemos(x.memos);
  if (x.readingWeak) saveWeak(new Set(x.readingWeak));
}
