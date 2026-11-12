"use client";

import Link from "next/link";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { currentStreak } from "@/lib/heatmap";
import {
  DEFAULT_PROGRESSION,
  RANKS,
  consumeFreezes,
  pointsOf,
  rankOf,
} from "@/lib/progression";

const h2 = "text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium";
const row = "flex justify-between items-center gap-4 text-small py-2 border-b border-[color:var(--line)]";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const date = (ms: number) => new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });

/** 급단 진행과 도달 기록. 구매와 사용 내역은 /shop에서 본다. */
export default function RewardsPage() {
  const now = useClientNow();
  const p = useStore((s) => s.progression ?? DEFAULT_PROGRESSION);
  const heatmap = useStore((s) => s.heatmap);

  if (now === null) return <ModePageShell title="級段" />;

  const rank = rankOf(p.xp);
  const points = pointsOf(p);
  // 표시용: 오늘 공부하면 휴식권이 메울 빈 날까지 미리 반영한 연속 일수.
  const streak = currentStreak(heatmap, now, consumeFreezes(p, heatmap, now).frozenDays);
  const span = rank.next ? rank.next.xp - rank.floor : 1;
  const ratio = rank.next ? (p.xp - rank.floor) / span : 1;

  return (
    <ModePageShell title="級段">
      <section className="mb-10">
        <div className="flex items-baseline justify-between">
          <div
            className="text-display leading-none font-semibold text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {rank.name}
          </div>
          <div className="text-caption tabular-nums text-[color:var(--fg-faint)]">연속 {streak}일</div>
        </div>
        <div
          role="progressbar"
          aria-label="다음 단계까지"
          aria-valuemin={rank.floor}
          aria-valuemax={rank.next?.xp ?? p.xp}
          aria-valuenow={p.xp}
          className="mt-4 h-px bg-[color:var(--line)]"
        >
          <div className="h-px bg-[color:var(--accent-progress)]" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        </div>
        <p className="mt-1 text-tiny tabular-nums tracking-wide text-[color:var(--fg-faint)]">
          {rank.next
            ? `${fmt(p.xp)} / ${fmt(rank.next.xp)} XP · 다음 ${rank.next.name}`
            : `${fmt(p.xp)} XP · 최고 단계`}
        </p>
      </section>

      <section className="mb-10">
        <h2 className={h2}>포인트</h2>
        <div
          className="text-h1 font-semibold tabular-nums text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)" }}
        >
          {fmt(points)}
          <span className="ml-1 text-caption text-[color:var(--fg-faint)]">pt</span>
        </div>
        <Link href="/shop" className="mt-3 min-h-11 inline-flex items-center text-small text-[color:var(--accent-progress-text)] underline underline-offset-4">상점에서 사용하기 →</Link>
      </section>

      <section className="mb-10">
        <h2 className={h2}>급단 기록</h2>
        {RANKS.map((r, i) =>
          p.rankAt[i] !== undefined ? (
            <div key={r.name} className={row}>
              <span style={{ fontFamily: "var(--font-jp-serif)" }} className="text-[color:var(--fg)]">
                {r.name}
              </span>
              <span className="text-caption tabular-nums text-[color:var(--fg-faint)]">{date(p.rankAt[i])}</span>
            </div>
          ) : null,
        )}
        {Object.keys(p.rankAt).length === 0 && (
          <p className="text-caption text-[color:var(--fg-faint)]">첫 정답부터 기록돼요.</p>
        )}
      </section>

    </ModePageShell>
  );
}
