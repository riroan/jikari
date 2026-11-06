"use client";

import { useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { StampMark } from "@/components/AnswerFeedback";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { currentStreak } from "@/lib/heatmap";
import { COSMETICS, SLOT_KO, hookOf, type Slot } from "@/lib/cosmetics";
import {
  DEFAULT_PROGRESSION,
  PALETTE_COST,
  PALETTES,
  consumeFreezes,
  pointsOf,
  rankOf,
} from "@/lib/progression";

const h2 = "text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium";
const row = "flex justify-between items-center gap-4 text-small py-2 border-b border-[color:var(--line)]";
const btn =
  "shrink-0 px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)] tabular-nums disabled:text-[color:var(--fg-faint)] disabled:opacity-60";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const SLOTS: readonly Slot[] = ["frame", "skin", "stamp"];

/** 프로필 — 급단 인장 + 꾸미기(테두리·선지 스킨·정답 도장·색 테마). 사는 버튼은 두 번 눌러야 실행. */
export default function ProfilePage() {
  const now = useClientNow();
  const p = useStore((s) => s.progression ?? DEFAULT_PROGRESSION);
  const heatmap = useStore((s) => s.heatmap);
  const shop = useStore((s) => s.shop);
  const [armed, setArmed] = useState<string | null>(null);

  if (now === null) return <ModePageShell title="プロフィール" />;

  const rank = rankOf(p.xp);
  const points = pointsOf(p);
  const streak = currentStreak(heatmap, now, consumeFreezes(p, heatmap, now).frozenDays);
  const frame = p.equip.frame ? hookOf(p.equip.frame) : "base";

  const confirmThen = (id: string, run: () => void) => () => {
    if (armed !== id) return setArmed(id);
    setArmed(null);
    run();
  };
  const label = (id: string, text: string) => (armed === id ? "확인?" : text);

  /** 보유하면 적용/사용 중, 아니면 가격(두 번 눌러 구매). */
  const action = (o: { id: string; owned: boolean; active: boolean; cost: number; buy: () => void; use: () => void }) =>
    o.owned ? (
      <button type="button" disabled={o.active} onClick={o.use} className={btn} style={{ minHeight: 44 }}>
        {o.active ? "사용 중" : "적용"}
      </button>
    ) : (
      <button
        type="button"
        disabled={points < o.cost}
        onClick={confirmThen(o.id, o.buy)}
        className={btn}
        style={{ minHeight: 44 }}
      >
        {label(o.id, `${fmt(o.cost)}pt`)}
      </button>
    );

  const preview = (slot: Slot, id: string) => {
    if (slot === "frame")
      return <span aria-hidden className={`inline-block w-6 h-6 rounded-sm frame-${id ? hookOf(id) : "base"}`} />;
    if (slot === "stamp")
      return (
        <span className="inline-flex w-6 justify-center text-[color:var(--accent-progress-text)]">
          <StampMark id={id} />
        </span>
      );
    return (
      <span data-skin={id ? hookOf(id) : undefined} aria-hidden className="inline-block w-16">
        <span
          data-state="idle"
          className="quiz-choice block px-2 py-1 text-tiny text-[color:var(--fg)] border border-[color:var(--line)] rounded-sm"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          あ
        </span>
      </span>
    );
  };

  return (
    <ModePageShell title="プロフィール">
      <section className="mb-10 flex items-center gap-6">
        <div
          className={`frame-${frame} w-32 h-32 shrink-0 rounded-sm flex flex-col items-center justify-center bg-[color:var(--bg)]`}
        >
          <div
            className="text-h1 leading-none font-semibold text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {rank.name}
          </div>
          <div className="mt-2 text-tiny tabular-nums tracking-wide text-[color:var(--fg-faint)]">
            {fmt(p.xp)} XP
          </div>
        </div>
        <dl className="flex flex-col gap-1 text-small">
          <div className="flex gap-3">
            <dt className="text-[color:var(--fg-faint)]">연속</dt>
            <dd className="tabular-nums text-[color:var(--fg)]">{streak}일</dd>
          </div>
          <div className="flex gap-3">
            <dt className="text-[color:var(--fg-faint)]">포인트</dt>
            <dd className="tabular-nums text-[color:var(--fg)]">{fmt(points)}pt</dd>
          </div>
          {rank.next && (
            <div className="flex gap-3">
              <dt className="text-[color:var(--fg-faint)]">다음</dt>
              <dd className="tabular-nums text-[color:var(--fg)]">
                {rank.next.name}까지 {fmt(rank.next.xp - p.xp)}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {SLOTS.map((slot) => (
        <section key={slot} className="mb-10">
          <h2 className={h2}>{SLOT_KO[slot]}</h2>
          <div className={row}>
            <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
              {preview(slot, "")}
              기본
            </span>
            {action({
              id: `${slot}:`,
              owned: true,
              active: p.equip[slot] === "",
              cost: 0,
              buy: () => {},
              use: () => shop({ kind: "equip", slot, id: "" }),
            })}
          </div>
          {COSMETICS.filter((c) => c.slot === slot).map((c) => (
            <div key={c.id} className={row}>
              <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
                {preview(slot, c.id)}
                <span style={{ fontFamily: "var(--font-jp-serif)" }}>{c.jp}</span>
                <span className="text-caption text-[color:var(--fg-faint)]">{c.ko}</span>
              </span>
              {action({
                id: c.id,
                owned: p.items.includes(c.id),
                active: p.equip[slot] === c.id,
                cost: c.cost,
                buy: () => shop({ kind: "item", id: c.id }),
                use: () => shop({ kind: "equip", slot, id: c.id }),
              })}
            </div>
          ))}
        </section>
      ))}

      <section className="mb-10">
        <h2 className={h2}>색 테마</h2>
        <div className={row}>
          <span className="text-[color:var(--fg-soft)]">기본</span>
          {action({
            id: "pal:",
            owned: true,
            active: p.palette === "",
            cost: 0,
            buy: () => {},
            use: () => shop({ kind: "use", id: "" }),
          })}
        </div>
        {PALETTES.map((pal) => (
          <div key={pal.id} className={row}>
            <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
              <span aria-hidden="true" className="inline-block w-6 h-1 rounded-sm" style={{ background: pal.swatch }} />
              <span style={{ fontFamily: "var(--font-jp-serif)" }}>{pal.jp}</span>
              <span className="text-caption text-[color:var(--fg-faint)]">{pal.ko}</span>
            </span>
            {action({
              id: `pal:${pal.id}`,
              owned: p.palettes.includes(pal.id),
              active: p.palette === pal.id,
              cost: PALETTE_COST,
              buy: () => shop({ kind: "palette", id: pal.id }),
              use: () => shop({ kind: "use", id: pal.id }),
            })}
          </div>
        ))}
      </section>
    </ModePageShell>
  );
}
