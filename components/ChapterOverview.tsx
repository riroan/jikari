"use client";

import Link from "next/link";
import { intensityBg, ratioToIntensity } from "@/lib/intensity";
import type {
  CardMode,
  ChapterMember,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "@/lib/types";

type AnyCard = KanjiCard | VocabCard | SentenceCard | GrammarCard;

/**
 * /chapters/[id]?mode=overview body — mastery summary + intro + per-mode
 * card counts (with 復習 chip when due > 0) + the quiz CTA. Pulled out of
 * page.tsx so the chapter detail file stops doing five things at once.
 */
export function ChapterOverview({
  chapter,
  members,
  mastery,
  mounted,
  dueCountsByMode,
}: {
  chapter: { id: string; name: string; intro: string | null };
  members: Array<{ member: ChapterMember; card: AnyCard }>;
  mastery: { masteredCount: number; validMembers: number; ratio: number };
  mounted: boolean;
  dueCountsByMode: Record<CardMode, number>;
}) {
  const percent = mounted ? Math.round(mastery.ratio * 100) : 0;
  const intensity = mounted ? ratioToIntensity(mastery.ratio) : 0;

  const counts: Record<CardMode, number> = {
    kanji: 0,
    vocab: 0,
    sentence: 0,
    grammar: 0,
    conjugation: 0,
    adjective: 0,
    expression: 0,
  };
  for (const { member } of members) counts[member.mode]++;

  return (
    <div className="flex flex-col gap-8">
      {/* Mastery summary */}
      <section>
        <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
          MASTERY
        </div>
        <div className="flex items-baseline gap-3">
          <div
            className="text-[40px] font-semibold tabular-nums leading-none"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--accent-progress)",
            }}
          >
            {percent}
            <span className="text-lg text-[color:var(--fg-faint)] font-normal ml-0.5">
              %
            </span>
          </div>
          <div className="text-caption text-[color:var(--fg-faint)] tabular-nums">
            {mastery.masteredCount} / {mastery.validMembers} 카드
          </div>
        </div>
        <div
          className="relative mt-3 h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: intensityBg(0) }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              background: intensityBg(intensity),
            }}
          />
        </div>
      </section>

      {/* Intro */}
      {chapter.intro && (
        <section>
          <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
            ABOUT
          </div>
          <p className="text-[15px] text-[color:var(--fg-soft)] leading-relaxed">
            {chapter.intro}
          </p>
        </section>
      )}

      {/* Member preview — count per mode */}
      <section>
        <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
          CARDS
        </div>
        <ul className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden">
          {(
            [
              ["vocab", "단어 / 単語"],
              ["kanji", "한자 / 漢字"],
              ["sentence", "문장·조사 / 文章·助詞"],
              ["grammar", "문법 / 文法"],
            ] as const
          )
            .filter(([m]) => counts[m] > 0)
            .map(([m, label]) => {
              const due =
                m === "sentence"
                  ? dueCountsByMode.sentence
                  : dueCountsByMode[m];
              return (
                <li
                  key={m}
                  className="bg-[color:var(--bg)] flex items-baseline justify-between px-4 py-2.5"
                >
                  <span className="text-small text-[color:var(--fg)]">
                    {label}
                  </span>
                  <span className="text-caption text-[color:var(--fg-faint)] tabular-nums">
                    {counts[m]}장
                    {due > 0 && (
                      <span className="ml-2 text-[color:var(--accent-progress)] font-medium">
                        ・{due} 복습
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      {/* Quiz button — label reflects review backlog when there is one. */}
      {members.length > 0 &&
        (() => {
          const totalDue = Object.values(dueCountsByMode).reduce(
            (a, b) => a + b,
            0,
          );
          // When there's a backlog the CTA goes "live" — accent-progress fill
          // signals "this is the action to take right now". Otherwise the
          // muted bg-deep keeps the page calm.
          const live = totalDue > 0;
          return (
            <section>
              <Link
                href={`/chapters/${chapter.id}?mode=quiz`}
                className={`flex items-center justify-center text-body font-medium px-4 py-3 rounded-sm transition-colors min-h-[44px] ${
                  live
                    ? "bg-[color:var(--accent-progress)] text-[color:var(--bg)] hover:opacity-90"
                    : "bg-[color:var(--bg-deep)] text-[color:var(--fg)] hover:bg-[color:var(--accent-korean)] hover:text-[color:var(--bg)]"
                }`}
              >
                {live
                  ? `복습 ${totalDue}장 시작 →`
                  : "이 챕터 퀴즈 시작 →"}
              </Link>
            </section>
          );
        })()}

      {members.length === 0 && (
        <section className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
          이 챕터에 사용 가능한 카드가 아직 없습니다. 콘텐츠 시드를 더 추가하면
          자동으로 채워져요.
        </section>
      )}
    </div>
  );
}
