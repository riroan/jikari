"use client";

import { useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { currentStreak } from "@/lib/heatmap";
import {
  DEFAULT_PROGRESSION,
  FREEZE_COST,
  FREEZE_MAX,
  RANKS,
  consumeFreezes,
  pointsOf,
  rankOf,
} from "@/lib/progression";

const h2 = "text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium";
const row = "flex justify-between items-center gap-4 text-small py-2 border-b border-[color:var(--line)]";
const btn =
  "shrink-0 px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)] tabular-nums disabled:text-[color:var(--fg-faint)] disabled:opacity-60";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const date = (ms: number) => new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });

/** 급단·포인트·보상. 포인트를 쓰는 버튼은 두 번 눌러야 실행된다 (첫 탭 = "확인?"). */
export default function RewardsPage() {
  const now = useClientNow();
  const p = useStore((s) => s.progression ?? DEFAULT_PROGRESSION);
  const heatmap = useStore((s) => s.heatmap);
  const shop = useStore((s) => s.shop);
  const [armed, setArmed] = useState<string | null>(null);

  if (now === null) return <ModePageShell title="褒美" />;

  const rank = rankOf(p.xp);
  const points = pointsOf(p);
  // 표시용: 오늘 공부하면 휴식권이 메울 빈 날까지 미리 반영한 연속 일수.
  const streak = currentStreak(heatmap, now, consumeFreezes(p, heatmap, now).frozenDays);
  const span = rank.next ? rank.next.xp - rank.floor : 1;
  const ratio = rank.next ? (p.xp - rank.floor) / span : 1;

  /** 포인트를 쓰는 동작: 첫 탭은 확인 대기, 두 번째 탭에 실행. */
  const confirmThen = (id: string, run: () => void) => () => {
    if (armed !== id) return setArmed(id);
    setArmed(null);
    run();
  };
  const label = (id: string, text: string) => (armed === id ? "확인?" : text);

  return (
    <ModePageShell title="褒美">
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
      </section>

      {p.rewards.length > 0 && (
      <section className="mb-10">
        <h2 className={h2}>내 보상</h2>
        {p.rewards.map((r) => (
          <div key={r.id} className={row}>
            <span className="text-[color:var(--fg)] break-keep">{r.name}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => shop({ kind: "remove", id: r.id })}
                className="min-h-11 px-2 text-caption text-[color:var(--fg-faint)] underline underline-offset-4"
                aria-label={`${r.name} 삭제`}
              >
                삭제
              </button>
              <button
                type="button"
                disabled={points < r.cost}
                onClick={confirmThen(`r:${r.id}`, () => shop({ kind: "redeem", id: r.id }))}
                className={btn}
                style={{ minHeight: 44 }}
              >
                {label(`r:${r.id}`, `${fmt(r.cost)}pt`)}
              </button>
            </span>
          </div>
        ))}
      </section>
      )}

      <section className="mb-10">
        <h2 className={h2}>휴식권</h2>
        <div className={row}>
          <span className="text-[color:var(--fg-soft)]">
            보유 {p.freezes} / {FREEZE_MAX}
          </span>
          <button
            type="button"
            disabled={p.freezes >= FREEZE_MAX || points < FREEZE_COST}
            onClick={confirmThen("freeze", () => shop({ kind: "freeze" }))}
            className={btn}
            style={{ minHeight: 44 }}
          >
            {label("freeze", `${fmt(FREEZE_COST)}pt`)}
          </button>
        </div>
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

      {p.ledger.length > 0 && (
        <section className="mb-10">
          <h2 className={h2}>사용 내역</h2>
          {p.ledger.slice(0, 20).map((l) => (
            <div key={`${l.at}:${l.label}`} className={row}>
              <span className="text-[color:var(--fg-soft)] break-keep">{l.label}</span>
              <span className="text-caption tabular-nums text-[color:var(--fg-faint)]">
                −{fmt(l.cost)} · {date(l.at)}
              </span>
            </div>
          ))}
        </section>
      )}
    </ModePageShell>
  );
}
