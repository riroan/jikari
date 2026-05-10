"use client";

import { useEffect, useRef, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore, exportState } from "@/lib/store";
import { parseBackup } from "@/lib/import";

export default function SettingsPage() {
  const replaceAll = useStore((s) => s.replaceAll);
  const reset = useStore((s) => s.reset);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const resetDialogRef = useRef<HTMLDialogElement>(null);

  function handleExport() {
    try {
      const json = exportState();
      const state = useStore.getState();
      const cardCount = Object.keys(state.learningStates).length;
      const streak = state.currentStreak;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      // Filename embeds card count so a folder of weekly backups is
      // sortable by snapshot size at a glance.
      a.href = url;
      a.download = `jikari-backup-${date}-${cardCount}cards.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({
        kind: "ok",
        text: `백업 다운로드 완료 — ${cardCount}장${
          streak > 0 ? `, 연속 ${streak}일` : ""
        }.`,
      });
    } catch (e) {
      setMessage({ kind: "err", text: `내보내기 실패: ${String(e)}` });
    }
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const result = parseBackup(text);
      if (!result.ok) {
        setMessage({ kind: "err", text: `가져오기 실패: ${result.error}` });
        return;
      }
      replaceAll(result.state);
      const cardCount = Object.keys(result.state.learningStates).length;
      setMessage({
        kind: "ok",
        text: `복원 완료 — ${cardCount}장.`,
      });
    } catch (e) {
      setMessage({ kind: "err", text: `가져오기 실패: ${String(e)}` });
    }
  }

  function openResetDialog() {
    resetDialogRef.current?.showModal();
  }

  function confirmReset() {
    reset();
    setMessage({ kind: "ok", text: "학습 기록이 초기화되었습니다." });
    resetDialogRef.current?.close();
  }

  return (
    <ModePageShell title="設定" headerMarginPx={48}>
      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          백업 / 복원
        </h2>
        <p className="text-caption text-[color:var(--fg-soft)] leading-relaxed mb-4">
          localStorage는 브라우저가 캐시를 정리하면 사라집니다. 정기적으로 JSON을 내보내 저장해두세요.
          iOS Safari는 7일 이상 앱 미사용 시 데이터를 삭제할 수 있습니다.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-3 text-[15px] text-left border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
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
            className="px-4 py-3 text-[15px] text-left border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          >
            JSON에서 불러오기
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          표시
        </h2>

        <label className="flex justify-between items-center text-small py-2 gap-4">
          <span className="text-[color:var(--fg-soft)]">테마</span>
          <ThemeChoice
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
          />
        </label>

        <label className="flex justify-between items-center text-small py-1">
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
            <span className="block text-caption text-[color:var(--fg-faint)] mt-0.5">
              이 박스부터 4지선다 대신 직접 입력
            </span>
          </span>
          <select
            value={settings.typingThresholdBox}
            onChange={(e) =>
              updateSettings({
                typingThresholdBox: Number(e.target.value) as 2 | 3 | 4 | 5,
              })
            }
            aria-label="타이핑 시작 박스"
            className="bg-transparent border border-[color:var(--line)] rounded-sm px-2 py-1.5 text-small text-[color:var(--fg)] focus:border-[color:var(--fg-soft)] focus:outline-none"
            style={{ minHeight: 36, minWidth: 64 }}
          >
            <option value={2}>2 (공격적)</option>
            <option value={3}>3</option>
            <option value={4}>4 (기본)</option>
            <option value={5}>5 (보수적)</option>
          </select>
        </label>
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
            color: message.kind === "ok" ? "var(--accent-progress)" : "var(--accent-korean)",
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
      className="bg-[color:var(--bg)] text-[color:var(--fg)] border border-[color:var(--line)] rounded-sm p-6 max-w-[340px] w-[calc(100%-2rem)] backdrop:bg-black/40"
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
        className="text-caption text-[color:var(--fg-soft)] leading-relaxed mb-4"
      >
        Leitner 박스, 히트맵, 연속 일수, 통계가 모두 사라집니다.
        되돌릴 수 없으니 먼저 JSON으로 내보내 두는 것을 권장합니다.
      </p>
      <p className="text-caption text-[color:var(--fg-faint)] leading-relaxed mb-2">
        계속하려면 <code className="text-[color:var(--fg)]">초기화</code>를 입력하세요.
      </p>
      <input
        type="text"
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
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
            className={`px-3 py-1.5 text-caption tracking-wide min-h-[36px] transition-colors ${
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
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors border border-[color:var(--line)]"
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
