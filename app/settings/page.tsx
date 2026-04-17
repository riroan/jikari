"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useStore, exportState } from "@/lib/store";
import { parseBackup } from "@/lib/import";

export default function SettingsPage() {
  const replaceAll = useStore((s) => s.replaceAll);
  const reset = useStore((s) => s.reset);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    try {
      const json = exportState();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `jikari-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ kind: "ok", text: "백업 파일이 다운로드되었습니다." });
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
      setMessage({ kind: "ok", text: "백업을 복원했습니다." });
    } catch (e) {
      setMessage({ kind: "err", text: `가져오기 실패: ${String(e)}` });
    }
  }

  function handleReset() {
    if (confirm("모든 학습 기록을 삭제합니다. 계속할까요?")) {
      reset();
      setMessage({ kind: "ok", text: "학습 기록이 초기화되었습니다." });
    }
  }

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-12">
          <Link
            href="/"
            className="text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <h1
            className="text-[15px] tracking-[0.15em] text-[color:var(--fg-soft)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            設定
          </h1>
        </header>

        <section className="mb-10">
          <h2 className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-3 font-medium">
            백업 / 복원
          </h2>
          <p className="text-[13px] text-[color:var(--fg-soft)] leading-relaxed mb-4">
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
          <h2 className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-3 font-medium">
            표시
          </h2>
          <label className="flex justify-between items-center text-[14px] py-1">
            <span className="text-[color:var(--fg-soft)]">후리가나 (한자 위 읽기)</span>
            <Toggle
              checked={settings.showFurigana}
              onChange={(checked) => updateSettings({ showFurigana: checked })}
              ariaLabel="후리가나 표시"
            />
          </label>
        </section>

        <section className="mb-10">
          <h2 className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-3 font-medium">
            일일 한도
          </h2>
          <div className="flex flex-col gap-3">
            <label className="flex justify-between items-center text-[14px]">
              <span className="text-[color:var(--fg-soft)]">신규 카드 / 일</span>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.dailyNewLimit}
                onChange={(e) =>
                  updateSettings({
                    dailyNewLimit: Math.max(1, Math.min(500, Number(e.target.value) || 1)),
                  })
                }
                className="w-20 px-2 py-1 text-right border border-[color:var(--line)] rounded-sm bg-transparent tabular-nums"
              />
            </label>
            <label className="flex justify-between items-center text-[14px]">
              <span className="text-[color:var(--fg-soft)]">복습 카드 / 일</span>
              <input
                type="number"
                min={1}
                max={2000}
                value={settings.dailyReviewLimit}
                onChange={(e) =>
                  updateSettings({
                    dailyReviewLimit: Math.max(1, Math.min(2000, Number(e.target.value) || 1)),
                  })
                }
                className="w-20 px-2 py-1 text-right border border-[color:var(--line)] rounded-sm bg-transparent tabular-nums"
              />
            </label>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-3 font-medium">
            위험 영역
          </h2>
          <button
            onClick={handleReset}
            className="w-full px-4 py-3 text-[14px] text-left border border-[color:var(--line)] rounded-sm text-[color:var(--accent-korean)] hover:bg-[color:var(--accent-korean)]/5 transition-colors"
          >
            모든 학습 기록 초기화
          </button>
        </section>

        {message && (
          <div
            className="p-3 text-[13px] rounded-sm"
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
      </div>
    </main>
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
