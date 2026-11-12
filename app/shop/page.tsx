"use client";

import { useState } from "react";
import Link from "next/link";
import { ModePageShell } from "@/components/ModePageShell";
import { CosmeticPreview } from "@/components/CosmeticPreview";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { COSMETICS, SLOT_KO, type Slot } from "@/lib/cosmetics";
import {
  DEFAULT_PROGRESSION,
  FREEZE_COST,
  FREEZE_MAX,
  PALETTE_COST,
  PALETTES,
  pointsOf,
} from "@/lib/progression";

const h2 = "text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium";
const row = "flex justify-between items-center gap-4 text-small py-2 border-b border-[color:var(--line)]";
const btn = "shrink-0 px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)] tabular-nums disabled:text-[color:var(--fg-faint)] disabled:opacity-60";
const fmt = (n: number) => n.toLocaleString("ko-KR");
const date = (ms: number) => new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });
const SLOTS: readonly Slot[] = ["frame", "skin", "stamp", "pack"];

/** 포인트를 쓰는 항목만 모은 상점. 첫 탭은 확인, 두 번째 탭에 구매한다. */
export default function ShopPage() {
  const now = useClientNow();
  const p = useStore((s) => s.progression ?? DEFAULT_PROGRESSION);
  const shop = useStore((s) => s.shop);
  const [armed, setArmed] = useState<string | null>(null);

  if (now === null) return <ModePageShell title="商店" />;

  const points = pointsOf(p);
  const buy = (id: string, run: () => void) => () => {
    if (armed !== id) return setArmed(id);
    setArmed(null);
    run();
  };
  const button = (id: string, name: string, cost: number, run: () => void, disabled = false) => (
    <button
      type="button"
      disabled={disabled || points < cost}
      onClick={buy(id, run)}
      className={btn}
      style={{ minHeight: 44 }}
      aria-label={armed === id ? `${name} ${fmt(cost)}포인트 구매 확인` : `${name} ${fmt(cost)}포인트 구매`}
    >
      {armed === id ? "확인?" : `${fmt(cost)}pt`}
    </button>
  );

  return (
    <ModePageShell title="商店">
      <section className="mb-10 flex items-end justify-between gap-4">
        <div>
          <h2 className={h2}>사용 가능한 포인트</h2>
          <div className="text-h1 font-semibold tabular-nums text-[color:var(--fg)]" style={{ fontFamily: "var(--font-jp-serif)" }}>
            {fmt(points)}<span className="ml-1 text-caption text-[color:var(--fg-faint)]">pt</span>
          </div>
        </div>
        <Link href="/profile" className="min-h-11 inline-flex items-center text-caption text-[color:var(--accent-progress-text)] underline underline-offset-4">프로필에서 적용 →</Link>
      </section>

      {SLOTS.map((slot) => (
        <section key={slot} className="mb-10">
          <h2 className={h2}>{SLOT_KO[slot]}</h2>
          {COSMETICS.filter((c) => c.slot === slot).map((c) => (
            <div key={c.id} className={row}>
              <span className="flex min-w-0 items-center gap-3 text-[color:var(--fg-soft)]">
                {slot !== "pack" && <CosmeticPreview slot={slot} id={c.id} />}
                <span className="flex flex-col">
                  <span style={{ fontFamily: "var(--font-jp-serif)" }}>{c.jp}</span>
                  <span className="text-caption text-[color:var(--fg-faint)]">{c.ko}</span>
                </span>
              </span>
              {p.items.includes(c.id)
                ? <span className="min-h-11 inline-flex items-center text-caption text-[color:var(--fg-faint)]">보유 중</span>
                : button(c.id, c.ko, c.cost, () => shop({ kind: "item", id: c.id }))}
            </div>
          ))}
        </section>
      ))}

      <section className="mb-10">
        <h2 className={h2}>색 테마</h2>
        {PALETTES.map((pal) => (
          <div key={pal.id} className={row}>
            <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
              <span aria-hidden="true" className="inline-block w-6 h-1 rounded-sm" style={{ background: pal.swatch }} />
              <span style={{ fontFamily: "var(--font-jp-serif)" }}>{pal.jp}</span>
              <span className="text-caption text-[color:var(--fg-faint)]">{pal.ko}</span>
            </span>
            {p.palettes.includes(pal.id)
              ? <span className="min-h-11 inline-flex items-center text-caption text-[color:var(--fg-faint)]">보유 중</span>
              : button(`pal:${pal.id}`, `색 테마 ${pal.ko}`, PALETTE_COST, () => shop({ kind: "palette", id: pal.id }))}
          </div>
        ))}
      </section>

      <section className="mb-10">
        <h2 className={h2}>휴식권</h2>
        <div className={row}>
          <span className="text-[color:var(--fg-soft)]">보유 {p.freezes} / {FREEZE_MAX}</span>
          {button("freeze", "휴식권", FREEZE_COST, () => shop({ kind: "freeze" }), p.freezes >= FREEZE_MAX)}
        </div>
      </section>

      {p.rewards.length > 0 && (
        <section className="mb-10">
          <h2 className={h2}>내 보상</h2>
          {p.rewards.map((reward) => (
            <div key={reward.id} className={row}>
              <span className="text-[color:var(--fg)] break-keep">{reward.name}</span>
              <span className="flex items-center gap-2">
                <button type="button" onClick={() => shop({ kind: "remove", id: reward.id })} className="min-h-11 px-2 text-caption text-[color:var(--fg-faint)] underline underline-offset-4" aria-label={`${reward.name} 삭제`}>삭제</button>
                {button(`reward:${reward.id}`, reward.name, reward.cost, () => shop({ kind: "redeem", id: reward.id }))}
              </span>
            </div>
          ))}
        </section>
      )}

      {p.ledger.length > 0 && (
        <section className="mb-10">
          <h2 className={h2}>사용 내역</h2>
          {p.ledger.slice(0, 20).map((entry) => (
            <div key={`${entry.at}:${entry.label}`} className={row}>
              <span className="text-[color:var(--fg-soft)] break-keep">{entry.label}</span>
              <span className="text-caption tabular-nums text-[color:var(--fg-faint)]">−{fmt(entry.cost)} · {date(entry.at)}</span>
            </div>
          ))}
        </section>
      )}
    </ModePageShell>
  );
}
