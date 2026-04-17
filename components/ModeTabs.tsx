"use client";

export type StudyMode = "study" | "quiz";

export function ModeTabs({
  mode,
  onChange,
}: {
  mode: StudyMode;
  onChange: (next: StudyMode) => void;
}) {
  return (
    <div
      className="flex gap-px bg-[color:var(--line)] rounded-sm overflow-hidden text-[13px] mb-8"
      role="tablist"
      aria-label="학습 모드"
    >
      <TabButton active={mode === "study"} onClick={() => onChange("study")} label="공부" sublabel="勉強" />
      <TabButton active={mode === "quiz"} onClick={() => onChange("quiz")} label="퀴즈" sublabel="問題" />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 py-2.5 flex items-baseline justify-center gap-1.5 transition-colors"
      style={{
        background: active ? "var(--bg-deep)" : "var(--bg)",
        color: active ? "var(--fg)" : "var(--fg-faint)",
        fontWeight: active ? 500 : 400,
      }}
    >
      <span>{label}</span>
      <span
        className="text-[10px] tracking-[0.1em]"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        {sublabel}
      </span>
    </button>
  );
}
