"use client";

import Link from "next/link";
import { ModePageShell } from "@/components/ModePageShell";
import { CosmeticPreview } from "@/components/CosmeticPreview";
import { RankEmblem } from "@/components/RankEmblem";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { currentStreak } from "@/lib/heatmap";
import { COSMETICS, SLOT_KO, hookOf, type EquipSlot } from "@/lib/cosmetics";
import {
  DEFAULT_PROGRESSION,
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
const SLOTS: readonly EquipSlot[] = ["frame", "skin", "stamp"];

/** 프로필 — 급단 인장과 보유한 꾸미기 아이템을 적용한다. 구매는 /shop. */
export default function ProfilePage() {
  const now = useClientNow();
  const p = useStore((s) => s.progression ?? DEFAULT_PROGRESSION);
  const heatmap = useStore((s) => s.heatmap);
  const shop = useStore((s) => s.shop);

  if (now === null) return <ModePageShell title="プロフィール" />;

  const rank = rankOf(p.xp);
  const points = pointsOf(p);
  const streak = currentStreak(heatmap, now, consumeFreezes(p, heatmap, now).frozenDays);
  const frame = p.equip.frame ? hookOf(p.equip.frame) : "base";

  const action = (active: boolean, use: () => void) => (
    <button type="button" disabled={active} onClick={use} className={btn} style={{ minHeight: 44 }}>
      {active ? "사용 중" : "적용"}
    </button>
  );

  return (
    <ModePageShell title="プロフィール">
      <section className="mb-10 flex items-center gap-6">
        <div className={`frame-${frame} w-32 h-32 shrink-0 rounded-sm bg-[color:var(--bg)]`}>
          <RankEmblem index={rank.index} name={rank.name} />
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

      <Link href="/shop" className="mb-10 min-h-11 inline-flex items-center self-start text-small text-[color:var(--accent-progress-text)] underline underline-offset-4">
        상점에서 꾸미기 아이템 보기 →
      </Link>

      {SLOTS.map((slot) => (
        <section key={slot} className="mb-10">
          <h2 className={h2}>{SLOT_KO[slot]}</h2>
          <div className={row}>
            <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
              <CosmeticPreview slot={slot} id="" />
              기본
            </span>
            {action(p.equip[slot] === "", () => shop({ kind: "equip", slot, id: "" }))}
          </div>
          {COSMETICS.filter((c) => c.slot === slot && p.items.includes(c.id)).map((c) => (
            <div key={c.id} className={row}>
              <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
                <CosmeticPreview slot={slot} id={c.id} />
                <span style={{ fontFamily: "var(--font-jp-serif)" }}>{c.jp}</span>
                <span className="text-caption text-[color:var(--fg-faint)]">{c.ko}</span>
              </span>
              {action(p.equip[slot] === c.id, () => shop({ kind: "equip", slot, id: c.id }))}
            </div>
          ))}
        </section>
      ))}

      {p.items.some((id) => COSMETICS.find((c) => c.id === id)?.slot === "pack") && <section className="mb-10">
        <h2 className={h2}>{SLOT_KO.pack}</h2>
        {COSMETICS.filter((c) => c.slot === "pack" && p.items.includes(c.id)).map((c) => (
            <div key={c.id} className={row}>
              <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
                <span style={{ fontFamily: "var(--font-jp-serif)" }}>{c.jp}</span>
                <span className="text-caption text-[color:var(--fg-faint)]">{c.ko}</span>
              </span>
              <span className="text-caption text-[color:var(--fg-faint)] min-h-11 inline-flex items-center">오늘의 한마디에 나와요</span>
            </div>
        ))}
      </section>}

      <section className="mb-10">
        <h2 className={h2}>색 테마</h2>
        <div className={row}>
          <span className="text-[color:var(--fg-soft)]">기본</span>
          {action(p.palette === "", () => shop({ kind: "use", id: "" }))}
        </div>
        {PALETTES.filter((pal) => p.palettes.includes(pal.id)).map((pal) => (
          <div key={pal.id} className={row}>
            <span className="flex items-center gap-3 text-[color:var(--fg-soft)]">
              <span aria-hidden="true" className="inline-block w-6 h-1 rounded-sm" style={{ background: pal.swatch }} />
              <span style={{ fontFamily: "var(--font-jp-serif)" }}>{pal.jp}</span>
              <span className="text-caption text-[color:var(--fg-faint)]">{pal.ko}</span>
            </span>
            {action(p.palette === pal.id, () => shop({ kind: "use", id: pal.id }))}
          </div>
        ))}
      </section>
    </ModePageShell>
  );
}
