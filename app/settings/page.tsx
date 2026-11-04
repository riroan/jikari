"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore, exportState } from "@/lib/store";
import { markReplaceNext } from "@/lib/remote-storage";
import { parseBackup, summarizeBackup } from "@/lib/import";
import { applyExtras, type BackupExtras } from "@/lib/extras";
import type { PersistedState } from "@/lib/types";
import { DAILY_GOALS, normalizeDailyGoal } from "@/lib/daily-goal";
import { useCardsStore } from "@/lib/cards-store";
import { useClientNow } from "@/lib/use-is-client";
import { useLocalPref } from "@/lib/use-local-pref";
import { SPEED_KEY, SPEED_RATES, isSpeechSpeed, type SpeechSpeed } from "@/lib/tts-speed";
import { speak } from "@/lib/tts";
import {
  RESPACE_DAYS,
  buildUndo,
  clearUndo,
  loadUndo,
  mergeUndo,
  planRespace,
  planUndo,
  saveUndo,
  type UndoSnapshot,
} from "@/lib/respace";

const BACKUP_TIMESTAMP_KEY = "jikari-last-backup-ms";

function readLastBackupMs(): number | null {
  try {
    const raw = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function formatRelative(diffMs: number): string {
  if (diffMs < 0) return "방금 전";
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const months = Math.floor(d / 30);
  return `${months}달 전`;
}

export default function SettingsPage() {
  const replaceAll = useStore((s) => s.replaceAll);
  const reset = useStore((s) => s.reset);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [speed, setSpeed] = useLocalPref<SpeechSpeed>(SPEED_KEY, "normal", isSpeechSpeed);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, setPending] = useState<PersistedState | null>(null);
  const pendingExtras = useRef<BackupExtras | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);
  const respaceDialogRef = useRef<HTMLDialogElement>(null);
  const [respaceDays, setRespaceDays] = useState<number>(14);
  const [undo, setUndo] = useState<UndoSnapshot | null>(() =>
    typeof window === "undefined" ? null : loadUndo(),
  );
  const setNextDues = useStore((s) => s.setNextDues);
  const learningStates = useStore((s) => s.learningStates);
  const now = useClientNow();
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const particleIds = useCardsStore((s) => s.particleIds);
  const vocabSet = useMemo(() => new Set(sentenceIds), [sentenceIds]);
  const particleSet = useMemo(() => new Set(particleIds), [particleIds]);
  // Lazy init reads localStorage once on first client render. The value is
  // refreshed only when the user clicks export (handleExport sets it directly).
  const [lastBackupMs, setLastBackupMs] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readLastBackupMs(),
  );

  async function handleExport() {
    try {
      const json = exportState();
      const state = useStore.getState();
      const cardCount = Object.keys(state.learningStates).length;
      const streak = state.currentStreak;
      const exportedAt = Date.now();
      const date = new Date(exportedAt).toISOString().slice(0, 10);
      // Filename embeds card count so a folder of weekly backups is
      // sortable by snapshot size at a glance.
      const name = `jikari-backup-${date}-${cardCount}cards.json`;
      const file = new File([json], name, { type: "application/json" });
      // Standalone iOS PWA: blob downloads are flaky, so use the share sheet
      // ("파일에 저장") when it can carry a File; otherwise fall back to <a download>.
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (standalone && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: name });
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return; // user closed the sheet
          throw e;
        }
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      try {
        localStorage.setItem(BACKUP_TIMESTAMP_KEY, String(exportedAt));
      } catch {
        // Privacy mode / quota — non-fatal.
      }
      setLastBackupMs(exportedAt);
      setMessage({
        kind: "ok",
        text: `백업 완료 — ${cardCount}장${streak > 0 ? `, 연속 ${streak}일` : ""}.`,
      });
    } catch (e) {
      setMessage({ kind: "err", text: `내보내기 실패: ${String(e)}` });
    }
  }

  async function handleImport(file: File) {
    try {
      const result = parseBackup(await file.text());
      if (!result.ok) {
        setMessage({ kind: "err", text: `가져오기 실패: ${result.message}` });
        return;
      }
      setMessage(null);
      pendingExtras.current = result.extras;
      setPending(result.state);
    } catch {
      setMessage({ kind: "err", text: "가져오기 실패: 파일을 읽을 수 없습니다." });
    }
  }

  function confirmRestore() {
    if (!pending) return;
    markReplaceNext(); // explicit restore: saved as-is, never merged back with other data
    replaceAll(pending);
    applyExtras(pendingExtras.current); // 오답 노트·메모 등 기기 로컬 데이터(백업에 있을 때만)
    clearUndo();
    setUndo(null);
    setMessage({
      kind: "ok",
      text: `복원 완료 — ${Object.keys(pending.learningStates).length}장.`,
    });
    setPending(null);
  }

  function confirmRespace() {
    const t = Date.now();
    const { changes } = planRespace(learningStates, t, respaceDays, settings.dailyGoal, vocabSet, particleSet);
    const n = Object.keys(changes).length;
    if (n === 0) {
      respaceDialogRef.current?.close();
      return;
    }
    const snap = mergeUndo(undo, buildUndo(learningStates, changes, t));
    const saved = saveUndo(snap);
    setNextDues(changes);
    setUndo(saved ? snap : null);
    setMessage({
      kind: "ok",
      text: `${n}장을 ${respaceDays}일에 나눠 정리했습니다.${saved ? "" : " (되돌리기 저장 실패)"}`,
    });
    respaceDialogRef.current?.close();
  }

  function undoRespace() {
    if (!undo) return;
    const changes = planUndo(useStore.getState().learningStates, undo);
    setNextDues(changes);
    clearUndo();
    setUndo(null);
    setMessage({ kind: "ok", text: `${Object.keys(changes).length}장의 복습일을 되돌렸습니다.` });
  }

  function openResetDialog() {
    resetDialogRef.current?.showModal();
  }

  function confirmReset() {
    markReplaceNext();
    reset();
    clearUndo();
    setUndo(null);
    setMessage({ kind: "ok", text: "학습 기록이 초기화되었습니다." });
    resetDialogRef.current?.close();
  }

  return (
    <ModePageShell title="設定" headerMarginPx={48}>
      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          백업 / 복원
        </h2>
        <p className="text-caption text-[color:var(--fg-soft)] leading-relaxed break-keep mb-4">
          학습 기록은 서버 DB에 저장됩니다. DB를 옮기거나 초기화하기 전에는
          JSON으로 내보내 두세요.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => void handleExport()}
            style={{ minHeight: 44 }}
            className="px-4 py-3 text-body text-left border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          >
            JSON으로 내보내기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImport(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{ minHeight: 44 }}
            className="px-4 py-3 text-body text-left border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          >
            JSON에서 불러오기
          </button>
        </div>
        {lastBackupMs !== null && now !== null && (() => {
          const diffMs = now - lastBackupMs;
          const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
          const stale = days >= 7;
          return (
            <p
              className={`mt-3 text-caption tabular-nums leading-relaxed break-keep ${
                stale
                  ? "text-[color:var(--accent-korean)]"
                  : "text-[color:var(--fg-faint)]"
              }`}
            >
              마지막 백업: {formatRelative(diffMs)}
              {stale && " — iOS 캐시 정리 위험. 새로 내보내세요."}
            </p>
          );
        })()}
        {lastBackupMs === null && (
          <p className="mt-3 text-caption text-[color:var(--fg-faint)] leading-relaxed break-keep">
            아직 이 브라우저에서 백업한 적이 없습니다.
          </p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          표시
        </h2>

        {/* div, not label: a label would forward clicks on "테마" to the first radio */}
        <div className="flex justify-between items-center text-small py-2 gap-4">
          <span className="text-[color:var(--fg-soft)]">테마</span>
          <ThemeChoice
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </div>

        <label className="flex justify-between items-center text-small min-h-[44px]">
          <span className="text-[color:var(--fg-soft)]">후리가나 (한자 위 읽기)</span>
          <Toggle
            checked={settings.showFurigana}
            onChange={(checked) => updateSettings({ showFurigana: checked })}
            ariaLabel="후리가나 표시"
          />
        </label>
      </section>

      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          학습
        </h2>
        <label className="flex justify-between items-center text-small py-2">
          <span className="text-[color:var(--fg-soft)]">
            타이핑 시작 박스
            <span className="block text-caption text-[color:var(--fg-faint)] mt-0.5 break-keep">
              이 박스부터 4지선다 대신 직접 입력
            </span>
          </span>
          <select
            value={settings.typingThresholdBox}
            onChange={(e) =>
              updateSettings({
                typingThresholdBox: Number(e.target.value) as 0 | 2 | 3 | 4 | 5,
              })
            }
            aria-label="타이핑 시작 박스"
            className="shrink-0 bg-transparent border border-[color:var(--line)] rounded-sm px-2 h-11 min-h-11 text-body text-[color:var(--fg)] focus:border-[color:var(--fg-soft)]"
            style={{ minHeight: 44, minWidth: 64 }}
          >
            <option value={0}>사용 안 함</option>
            <option value={2}>2 (공격적)</option>
            <option value={3}>3</option>
            <option value={4}>4 (기본)</option>
            <option value={5}>5 (보수적)</option>
          </select>
        </label>
        <label className="flex justify-between items-center text-small py-2">
          <span className="text-[color:var(--fg-soft)]">
            하루 목표
            <span className="block text-caption text-[color:var(--fg-faint)] mt-0.5 break-keep">
              홈의 진행선이 채워지는 복습 수
            </span>
          </span>
          <select
            value={settings.dailyGoal}
            onChange={(e) =>
              updateSettings({ dailyGoal: normalizeDailyGoal(Number(e.target.value)) })
            }
            aria-label="하루 목표"
            className="shrink-0 bg-transparent border border-[color:var(--line)] rounded-sm px-2 h-11 min-h-11 text-body text-[color:var(--fg)] focus:border-[color:var(--fg-soft)]"
            style={{ minHeight: 44, minWidth: 64 }}
          >
            {DAILY_GOALS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex justify-between items-center text-small py-2">
          <span className="text-[color:var(--fg-soft)]">
            발음 속도
            <span className="block text-caption text-[color:var(--fg-faint)] mt-0.5 break-keep">
              이 기기에서 모든 발음 듣기에 적용
            </span>
          </span>
          <select
            value={speed}
            onChange={(e) => {
              const next = e.target.value as SpeechSpeed;
              setSpeed(next);
              speak("ありがとう", SPEED_RATES[next]);
            }}
            aria-label="발음 속도"
            className="shrink-0 bg-transparent border border-[color:var(--line)] rounded-sm px-2 h-11 min-h-11 text-body text-[color:var(--fg)] focus:border-[color:var(--fg-soft)]"
            style={{ minHeight: 44, minWidth: 64 }}
          >
            <option value="normal">보통</option>
            <option value="slow">느리게</option>
          </select>
        </label>
        <div id="backlog" className="flex justify-between items-center text-small py-2 gap-4 scroll-mt-4">
          <span className="text-[color:var(--fg-soft)]">
            밀린 복습 정리
            <span className="block text-caption text-[color:var(--fg-faint)] mt-0.5 break-keep">
              밀린 카드를 며칠에 나눠 배치 (단계·기록은 그대로)
            </span>
          </span>
          <button
            onClick={() => respaceDialogRef.current?.showModal()}
            className="px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)] shrink-0"
            style={{ minHeight: 44 }}
          >
            정리
          </button>
        </div>
        {undo && Object.keys(planUndo(learningStates, undo)).length > 0 && (
          <div className="flex justify-between items-center text-caption text-[color:var(--fg-faint)] gap-4">
            <span>
              {new Date(undo.appliedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}에 {undo.entries.length}장 정리함
            </span>
            <button
              onClick={undoRespace}
              className="px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)] shrink-0"
              style={{ minHeight: 44 }}
            >
              되돌리기
            </button>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          위험 영역
        </h2>
        <button
          onClick={openResetDialog}
          className="w-full px-4 py-3 text-small text-left border border-[color:var(--line)] rounded-sm text-[color:var(--accent-korean)] hover:bg-[color:var(--accent-korean)]/5 transition-colors"
        >
          모든 학습 기록 초기화
        </button>
      </section>

      {pending && (
        <RestoreDialog
          incoming={pending}
          current={useStore.getState()}
          onConfirm={confirmRestore}
          onCancel={() => setPending(null)}
        />
      )}

      <RespaceDialog
        ref={respaceDialogRef}
        states={learningStates}
        vocabIds={vocabSet}
        particleIds={particleSet}
        goal={settings.dailyGoal}
        days={respaceDays}
        onDays={setRespaceDays}
        lastBackupMs={lastBackupMs}
        onExport={handleExport}
        onConfirm={confirmRespace}
        onCancel={() => respaceDialogRef.current?.close()}
      />

      <ResetDialog
        ref={resetDialogRef}
        onConfirm={confirmReset}
        onCancel={() => resetDialogRef.current?.close()}
      />

      {message && (
        <div
          className="p-3 text-caption rounded-sm"
          style={{
            background:
              message.kind === "ok"
                ? "color-mix(in oklab, var(--accent-progress) 15%, transparent)"
                : "color-mix(in oklab, var(--accent-korean) 15%, transparent)",
            color: message.kind === "ok" ? "var(--accent-progress-text)" : "var(--accent-korean)",
          }}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}
    </ModePageShell>
  );
}

const RespaceDialog = forwardRef<
  HTMLDialogElement,
  {
    states: PersistedState["learningStates"];
    vocabIds: ReadonlySet<string>;
    particleIds: ReadonlySet<string>;
    goal: number;
    days: number;
    onDays: (n: number) => void;
    lastBackupMs: number | null;
    onExport: () => void;
    onConfirm: () => void;
    onCancel: () => void;
  }
>(function RespaceDialog({ states, vocabIds, particleIds, goal, days, onDays, lastBackupMs, onExport, onConfirm, onCancel }, ref) {
  const t = useClientNow() ?? 0;
  const plan = useMemo(
    () => planRespace(states, t, days, goal, vocabIds, particleIds),
    [states, t, days, goal, vocabIds, particleIds],
  );
  const moved = Object.keys(plan.changes).length;
  const end = new Date(t);
  end.setDate(end.getDate() + days - 1);
  const fmt = (d: Date) => d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  const btn = "px-4 text-small border border-[color:var(--line)] rounded-sm";
  return (
    <dialog
      ref={ref}
      aria-labelledby="respace-dialog-title"
      className="m-auto w-[min(92vw,420px)] p-5 rounded-sm bg-[color:var(--bg)] text-[color:var(--fg)] border border-[color:var(--line)] backdrop:bg-black/40"
    >
      <h2 id="respace-dialog-title" className="text-body font-semibold mb-2">
        밀린 복습 정리
      </h2>
      <p className="text-small text-[color:var(--fg-soft)] mb-3 break-keep">
        밀린 카드 {plan.overdue}장 중 오래된 {plan.overdue - moved}장은 오늘 그대로 두고,
        나머지 {moved}장의 복습일만 {days > 1 ? `내일부터 ${fmt(end)}까지` : "오늘"} 고르게 나눕니다.
        단계·기록·연속일은 바뀌지 않습니다.
      </p>
      <div className="flex gap-2 mb-3" role="group" aria-label="기간">
        {RESPACE_DAYS.map((n) => (
          <button
            key={n}
            aria-pressed={days === n}
            onClick={() => onDays(n)}
            className={`${btn} flex-1 ${days === n ? "bg-[color:var(--fg)] text-[color:var(--bg)]" : ""}`}
            style={{ minHeight: 44 }}
          >
            {n}일
          </button>
        ))}
      </div>
      <p className="text-caption text-[color:var(--fg-faint)] tabular-nums mb-3 break-keep">
        하루 약 {Math.max(...plan.perDay.slice(1), 0)}장 · 오늘 {plan.perDay[0]}장
      </p>
      <div className="flex items-center justify-between gap-3 text-caption text-[color:var(--fg-faint)] mb-4">
        <span>
          {lastBackupMs ? `마지막 백업 ${formatRelative(t - lastBackupMs)}` : "먼저 백업을 권장합니다."}
        </span>
        <button type="button" onClick={onExport} className={`${btn} shrink-0`} style={{ minHeight: 44 }}>
          먼저 백업 내보내기
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={btn} style={{ minHeight: 44 }}>
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={moved === 0}
          className={`${btn} bg-[color:var(--fg)] text-[color:var(--bg)] disabled:opacity-40`}
          style={{ minHeight: 44 }}
        >
          정리하기
        </button>
      </div>
    </dialog>
  );
});

function fmtDate(ms: number) {
  return ms > 0 ? new Date(ms).toLocaleDateString("ko-KR", { year: "2-digit", month: "numeric", day: "numeric" }) : "기록 없음";
}

/** Preview + explicit confirm before a backup overwrites current progress. */
function RestoreDialog({
  incoming,
  current,
  onConfirm,
  onCancel,
}: {
  incoming: PersistedState;
  current: PersistedState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const a = summarizeBackup(current);
  const b = summarizeBackup(incoming);
  const rows: [string, string, string][] = [
    ["카드", `${a.cards}장`, `${b.cards}장`],
    ["연속 일수", `${a.streak}일`, `${b.streak}일`],
    ["학습한 날", `${a.studyDays}일`, `${b.studyDays}일`],
    ["마지막 학습", fmtDate(a.lastActiveAt), fmtDate(b.lastActiveAt)],
    ["하루 목표", `${a.dailyGoal}`, `${b.dailyGoal}`],
  ];
  return (
    <dialog
      ref={ref}
      aria-labelledby="restore-dialog-title"
      className="bg-[color:var(--bg)] text-[color:var(--fg)] border border-[color:var(--line)] rounded-sm p-6 m-auto max-w-[340px] w-[calc(100%-2rem)] backdrop:bg-black/40"
      onCancel={onCancel}
    >
      <h2
        id="restore-dialog-title"
        className="text-h2 font-semibold mb-3"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        백업 복원
      </h2>
      <p className="text-body text-[color:var(--fg-soft)] leading-relaxed mb-4 break-keep">
        현재 학습 기록이 이 백업으로 덮어써집니다.
      </p>
      <table className="w-full text-body tabular-nums mb-5">
        <thead>
          <tr className="text-[color:var(--fg-faint)]">
            <th className="text-left font-normal py-1" />
            <th className="text-right font-normal py-1">현재</th>
            <th className="text-right font-normal py-1">백업</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, x, y]) => (
            <tr key={k}>
              <td className="py-1 text-[color:var(--fg-soft)]">{k}</td>
              <td className="py-1 text-right">{x}</td>
              <td className="py-1 text-right">{y}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-body text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          style={{ minHeight: 44 }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-body text-[color:var(--bg)] bg-[color:var(--accent-korean)] rounded-sm hover:opacity-90"
          style={{ minHeight: 44 }}
        >
          덮어쓰기
        </button>
      </div>
    </dialog>
  );
}

/**
 * Confirm-before-destroy modal for the reset action. Built on the
 * native <dialog> element so we get focus trap, ESC-to-close and a
 * backdrop overlay without an a11y library. Styled with the same
 * paper/line/fg tokens the rest of the app uses, so the prompt feels
 * like a continuation of the page rather than a browser-chrome popup.
 */
function ResetDialog({
  ref,
  onConfirm,
  onCancel,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // Reset typed-confirmation state every time the dialog is closed so
  // the next open requires a fresh decision.
  const [phrase, setPhrase] = useState("");
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setPhrase("");
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [ref]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="reset-dialog-title"
      aria-describedby="reset-dialog-body"
      className="bg-[color:var(--bg)] text-[color:var(--fg)] border border-[color:var(--line)] rounded-sm p-6 m-auto max-w-[340px] w-[calc(100%-2rem)] backdrop:bg-black/40"
      onCancel={onCancel}
    >
      <h2
        id="reset-dialog-title"
        className="text-h2 font-semibold mb-3 text-[color:var(--accent-korean)]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        학습 기록 초기화
      </h2>
      <p
        id="reset-dialog-body"
        className="text-caption text-[color:var(--fg-soft)] leading-relaxed mb-4 break-keep"
      >
        Leitner 박스, 히트맵, 연속 일수, 통계가 모두 사라집니다.
        되돌릴 수 없으니 먼저 JSON으로 내보내 두는 것을 권장합니다.
      </p>
      <p className="text-caption text-[color:var(--fg-faint)] leading-relaxed mb-2 break-keep">
        계속하려면 <code className="text-[color:var(--fg)]">초기화</code>를 입력하세요.
      </p>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        onKeyDown={(e) => {
          // Enter on a fully-typed phrase = confirm. Otherwise no-op so a
          // misfired keystroke during typing doesn't fire the destroy.
          if (
            e.key === "Enter" &&
            !e.nativeEvent.isComposing &&
            phrase.trim() === "초기화"
          ) {
            e.preventDefault();
            onConfirm();
          }
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="초기화 확인 문구"
        className="w-full bg-transparent text-body text-[color:var(--fg)] px-1 py-2 mb-5 border-0 border-b border-[color:var(--line)] focus:border-[color:var(--fg)] focus:outline-none"
        style={{ minHeight: 44 }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-caption tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          style={{ minHeight: 44 }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={phrase.trim() !== "초기화"}
          className="px-4 py-2 text-caption tracking-tab text-[color:var(--bg)] bg-[color:var(--accent-korean)] rounded-sm transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          style={{ minHeight: 44 }}
        >
          삭제
        </button>
      </div>
    </dialog>
  );
}

type ThemeOption = "light" | "dark" | "system";

function ThemeChoice({
  value,
  onChange,
}: {
  value: ThemeOption;
  onChange: (next: ThemeOption) => void;
}) {
  const opts: { id: ThemeOption; label: string }[] = [
    { id: "light", label: "라이트" },
    { id: "dark", label: "다크" },
    { id: "system", label: "시스템" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="테마 선택"
      className="inline-flex border border-[color:var(--line)] rounded-sm overflow-hidden"
    >
      {opts.map((o, i) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`px-3 py-1.5 text-caption tracking-wide min-h-11 transition-colors ${
              i > 0 ? "border-l border-[color:var(--line)]" : ""
            } ${
              active
                ? "bg-[color:var(--bg-deep)] text-[color:var(--fg)]"
                : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      // 스위치는 24px 높이 그대로 두고 터치 영역만 위아래로 44px까지 넓힌다.
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors border border-[color:var(--line)] before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']"
      style={{
        background: checked
          ? "color-mix(in oklab, var(--accent-progress) 85%, transparent)"
          : "var(--bg-deep)",
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-[color:var(--bg)] transition-transform"
        style={{
          transform: checked ? "translateX(22px)" : "translateX(4px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}
      />
    </button>
  );
}
