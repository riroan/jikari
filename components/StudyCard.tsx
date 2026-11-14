"use client";

/**
 * Study card — 플래시카드 공부 화면.
 *
 * 구성 (위→아래): 진행 막대 · 카드 틀(상태 배지, 아이콘, 본문, 되돌리기) · 하단 고정 버튼.
 *
 * `grade`를 주면 하단이 "다시 학습 / 알고있음 (N일 후 복습)" 두 버튼이 되고, 누르면
 * review()로 복습 일정에 기록한다. 되돌리기는 직전 판정 전의 상태 조각으로 되돌린다.
 * `grade`가 없으면(활용·문법처럼 화면 카드와 SRS 카드가 1:1이 아닌 곳) 이전/다음.
 *
 * `hideable`이면 눈 아이콘으로 본문의 `data-answer` 부분을 가린다 (탭하면 그 카드만 보임).
 * 스와이프와 ← / → 키는 판정 없이 넘겨 보기다.
 */

import { useEffect, useRef, useState } from "react";
import { SpeakButton } from "./SpeakButton";
import { ShadowButton } from "./ShadowButton";
import { useStore, type UndoSnapshot } from "@/lib/store";
import { cardKey, previewKnownDays } from "@/lib/srs";
import { toLocalDateKey } from "@/lib/heatmap";
import { useLocalPref } from "@/lib/use-local-pref";
import type { CardMode } from "@/lib/types";

export interface StudyGrade {
  mode: CardMode;
  cardId: string;
  /** review()의 레이팅 갱신용 (퀴즈와 같은 값). */
  difficulty?: number;
}

const isOnOff = (r: string): r is "on" | "off" => r === "on" || r === "off";

export function StudyCard({
  body,
  speak,
  shadow,
  position,
  total,
  onPrev,
  onNext,
  grade,
  hideable = false,
}: {
  body: React.ReactNode;
  /** Japanese text to pronounce (study shows both sides, so no answer leak). */
  speak?: string;
  /** Show the 따라 말하기 record/playback button next to the speaker. */
  shadow?: boolean;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  grade?: StudyGrade;
  hideable?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const nav = useRef({ onPrev, onNext });
  useEffect(() => {
    nav.current = { onPrev, onNext };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowRight") nav.current.onNext();
      else if (e.key === "ArrowLeft") nav.current.onPrev();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const review = useStore((s) => s.review);
  const snapshotForUndo = useStore((s) => s.snapshotForUndo);
  const restoreUndo = useStore((s) => s.restoreUndo);
  const state = useStore((s) => (grade ? s.learningStates[cardKey(grade.mode, grade.cardId)] : undefined));
  const heatmap = useStore((s) => s.heatmap);
  const goal = useStore((s) => s.settings.dailyGoal);
  // 되돌리기 스택: 판정 직전 상태. 카드 틀이 바뀌어도(같은 컴포넌트) 이어진다.
  const [history, setHistory] = useState<UndoSnapshot[]>([]);
  const [hidePref, setHidePref] = useLocalPref("jikari-study-hide", "off", isOnOff);
  const cardTag = grade?.cardId ?? String(position);
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const hidden = hideable && hidePref === "on" && revealedFor !== cardTag;
  const [now] = useState(() => Date.now());

  const todayCount = heatmap[toLocalDateKey(now)] ?? 0;
  const progress = grade
    ? { label: `${Math.min(todayCount, goal)}/${goal}`, ratio: Math.min(todayCount / goal, 1) }
    : { label: `${position} / ${total}`, ratio: total > 0 ? position / total : 0 };
  const knownDays = grade ? previewKnownDays(state, grade.mode, grade.cardId, now) : 0;
  const status = !state || state.lastReviewed === 0 ? "New" : state.box >= 5 ? "익힘" : "학습 중";

  const judge = (known: boolean) => {
    if (!grade) return;
    const snap = snapshotForUndo();
    review(grade.mode, grade.cardId, known, "choice", grade.difficulty);
    setHistory((h) => [...h.slice(-19), snap]);
    onNext();
  };
  const undo = () => {
    const snap = history[history.length - 1];
    if (!snap) return;
    restoreUndo(snap);
    setHistory((h) => h.slice(0, -1));
    onPrev();
  };

  const icon =
    "inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] transition-colors";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className="text-label tabular-nums tracking-wide text-[color:var(--fg-faint)] font-medium"
          aria-live="polite"
          aria-label={grade ? `오늘 ${progress.label}` : `${position}번째 / ${total}`}
        >
          {progress.label}
        </span>
        <div className="flex-1 h-1 rounded-full bg-[color:var(--line)] overflow-hidden">
          <div
            className="h-1 rounded-full bg-[color:var(--accent-progress)] transition-[width]"
            style={{ width: `${progress.ratio * 100}%` }}
          />
        </div>
        {grade && (
          <span className="text-label tabular-nums text-[color:var(--fg-faint)]">
            {position} / {total}
          </span>
        )}
      </div>

      <section className="flex flex-col gap-3 border border-[color:var(--line)] rounded-sm px-4 pt-2 pb-3">
        <div className="flex items-center justify-between gap-2 -mx-1">
          <span
            className={`px-2 py-0.5 text-tiny tracking-wide rounded-sm border ${
              status === "New"
                ? "border-[color:var(--accent-progress)] text-[color:var(--accent-progress-text)]"
                : "border-[color:var(--line)] text-[color:var(--fg-faint)]"
            }`}
          >
            {status}
          </span>
          <div className="flex items-center">
            {hideable && (
              <button
                type="button"
                className={icon}
                aria-pressed={hidePref === "on"}
                aria-label={hidePref === "on" ? "답 보이기" : "답 가리기"}
                onClick={() => setHidePref(hidePref === "on" ? "off" : "on")}
              >
                <EyeIcon off={hidePref === "on"} />
              </button>
            )}
            {speak && <SpeakButton text={speak} />}
            {speak && shadow && <ShadowButton key={speak} />}
          </div>
        </div>

        <div
          data-hide-answers={hidden ? "" : undefined}
          className="select-none touch-pan-y [-webkit-touch-callout:none]"
          onClick={() => hidden && setRevealedFor(cardTag)}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (t.clientX < 20) return; // 왼쪽 끝은 iOS 뒤로 가기 몫
            start.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const s0 = start.current;
            start.current = null;
            if (!s0) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - s0.x;
            if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(t.clientY - s0.y)) {
              (dx < 0 ? onNext : onPrev)();
            }
          }}
        >
          {body}
        </div>
        {hidden && (
          <p className="text-center text-caption text-[color:var(--fg-faint)]">탭해서 보기</p>
        )}

        {grade && (
          <div className="-mx-1">
            <button
              type="button"
              onClick={undo}
              disabled={history.length === 0}
              aria-label="직전 판정 되돌리기"
              className={`${icon} disabled:opacity-30`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 7H5V3 M5.5 7.5A8 8 0 1 1 4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </section>

      {/*
        하단 고정 줄. 내용 바로 아래에 두면 예시가 많은 카드에서 버튼이 밀려 엄지 위치가
        바뀐다. body의 overflow-x:hidden 때문에 sticky가 듣지 않아 fixed + spacer로 둔다.
      */}
      <div aria-hidden className={grade ? "h-[calc(5.5rem+var(--sync-gap))]" : "h-[calc(4rem+var(--sync-gap))]"} />
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[color:var(--bg)] border-t border-[color:var(--line)] pl-[var(--safe-left)] pr-[var(--safe-right)] pb-[calc(var(--safe-bottom)+var(--sync-gap))]">
        {grade ? (
          <div className="mx-auto w-full max-w-[390px] lg:max-w-[600px] px-6 pt-3 pb-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => judge(false)}
              className="min-h-[56px] rounded-sm border border-[color:var(--line)] bg-[color:var(--bg-deep)] text-body text-[color:var(--fg)] active:opacity-80 transition-opacity"
            >
              다시 학습
            </button>
            <button
              type="button"
              onClick={() => judge(true)}
              className="min-h-[56px] rounded-sm bg-[color:var(--fg)] text-[color:var(--bg)] flex flex-col items-center justify-center active:opacity-80 transition-opacity"
            >
              <span className="text-body font-semibold">알고있음</span>
              <span className="text-tiny opacity-80 tabular-nums">{knownDays}일 후 복습</span>
            </button>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[390px] lg:max-w-[600px] px-6 flex items-center">
            <button onClick={onPrev} className={navBtn} aria-label="이전 카드">
              ← 이전
            </button>
            <button onClick={onNext} className={navBtn} aria-label="다음 카드">
              다음 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const navBtn =
  "flex-1 text-small text-[color:var(--fg-soft)] tracking-wider hover:text-[color:var(--fg)] transition-colors min-h-[44px] py-4 inline-flex items-center justify-center";

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.5" />
      {off && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}
