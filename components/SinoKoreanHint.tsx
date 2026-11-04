import { sinoKoreanHint } from "@/lib/sino-korean";

/**
 * 받침 → 음독 어미 대응 한 줄 (학 → がく). 규칙이 들어맞는 한자에만 나온다.
 * 정답 면 전용 — 앞면에 두면 읽기를 알려주는 셈이다.
 */
export function SinoKoreanHint({
  koreanSound,
  onReadings,
}: {
  koreanSound: readonly string[];
  onReadings: readonly string[];
}) {
  const hint = sinoKoreanHint(koreanSound, onReadings);
  if (!hint) return null;
  return (
    <div
      className="text-caption text-[color:var(--fg-faint)] leading-relaxed"
      style={{ fontFamily: "var(--font-kr-sans)" }}
      data-testid="sino-korean-hint"
    >
      받침 {hint.batchim} → <span lang="ja" style={{ fontFamily: "var(--font-jp-sans)" }}>{hint.endings.join("·")}</span>
      <span className="ml-2">
        {hint.sound} → <span lang="ja" style={{ fontFamily: "var(--font-jp-sans)" }}>{hint.reading}</span>
      </span>
    </div>
  );
}
