export default function Home() {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        {/* Top: brand + streak */}
        <header className="flex justify-between items-baseline mb-12">
          <div className="flex items-baseline">
            <span
              className="text-[22px] font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              jikari
            </span>
            <span
              className="ml-1.5 text-xs text-[color:var(--fg-faint)] tracking-[0.15em]"
            >
              じかり
            </span>
          </div>
          <div
            className="text-[13px] text-[color:var(--fg-faint)] tracking-wider"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            <span className="text-[color:var(--accent-korean)] font-medium mr-1 tabular-nums">
              連続 1日
            </span>
          </div>
        </header>

        {/* Hero: kanji of the day */}
        <section className="mb-14">
          <div
            className="text-[156px] leading-none font-semibold mb-5"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--fg)",
            }}
          >
            日
          </div>
          <div
            className="flex flex-col gap-1.5 pl-1"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            <div className="flex gap-3.5 items-baseline">
              <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
                音
              </span>
              <span className="text-[17px] text-[color:var(--fg-soft)]">
                にち ・ じつ
              </span>
            </div>
            <div className="flex gap-3.5 items-baseline">
              <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
                訓
              </span>
              <span className="text-[17px] text-[color:var(--fg-soft)]">
                ひ ・ び ・ か
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-dashed border-[color:var(--line)] flex gap-2.5 items-baseline">
              <span
                className="text-xs font-semibold tracking-[0.1em] text-[color:var(--accent-korean)]"
                style={{ fontFamily: "var(--font-jp-serif)" }}
              >
                韓
              </span>
              <span className="text-sm text-[color:var(--fg-soft)]">
                일 — 날 · 해
              </span>
            </div>
          </div>
        </section>

        {/* Today */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-1.5 font-medium">
            TODAY
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[48px] font-semibold tabular-nums"
              style={{
                fontFamily: "var(--font-jp-serif)",
                letterSpacing: "-0.03em",
              }}
            >
              0
            </span>
            <span className="text-base text-[color:var(--fg-soft)]">
              cards ready
            </span>
          </div>
        </section>

        {/* Development notice */}
        <section className="mt-8 p-4 border border-[color:var(--line)] rounded-sm">
          <div className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] mb-2 font-medium">
            STATUS
          </div>
          <p className="text-sm text-[color:var(--fg-soft)] leading-relaxed">
            Week 1 Day 1 — 스캐폴드 + 타이포그래피 확인 중. 폰트 3종이 제대로
            렌더되면 오늘 완료.
          </p>
        </section>
      </div>
    </main>
  );
}
