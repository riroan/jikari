"use client";

import { useEffect, useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { useCardsStore } from "@/lib/cards-store";
import { SUBJECT_LABEL, buildIndex, search, type SearchEntry } from "@/lib/search";

const PAGE = 30;

export default function SearchPage() {
  const kanji = useCardsStore((s) => s.kanji);
  const vocab = useCardsStore((s) => s.vocab);
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  const grammar = useCardsStore((s) => s.grammar);
  const index = useMemo(
    () => buildIndex({ kanji, vocab, sentences, expressions, grammar }),
    [kanji, vocab, sentences, expressions, grammar],
  );

  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input);
      setLimit(PAGE);
      setOpen(null);
    }, 150);
    return () => clearTimeout(t);
  }, [input]);

  const { hits, total } = useMemo(() => search(index, query, limit), [index, query, limit]);
  const trimmed = query.trim();

  return (
    <ModePageShell title="検索">
      <input
        type="search"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="일본어 · 로마자 · 한국어"
        aria-label="카드 검색"
        enterKeyHint="search"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        className="w-full min-h-[44px] bg-transparent border-0 border-b border-[color:var(--line)] focus:border-[color:var(--fg-soft)] outline-none text-[17px] text-[color:var(--fg)] placeholder:text-[color:var(--fg-faint)] py-2"
      />
      <div aria-live="polite" className="mt-3 text-caption text-[color:var(--fg-faint)] min-h-[1.25rem]">
        {trimmed && total > 0 && `${total}개`}
      </div>
      {trimmed && total === 0 && (
        <p className="pt-12 text-center text-[color:var(--fg-faint)] text-caption leading-relaxed">
          찾는 카드가 없어요.
          <br />
          다른 철자나 한국어 뜻으로 검색해 보세요.
        </p>
      )}
      <ul>
        {hits.map((h) => (
          <Row key={h.key} e={h} open={open === h.key} onToggle={() => setOpen(open === h.key ? null : h.key)} />
        ))}
      </ul>
      {total > hits.length && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="w-full min-h-[44px] mt-2 text-caption tracking-wider text-[color:var(--fg-soft)] hover:text-[color:var(--fg)]"
        >
          더 보기 ({total - hits.length})
        </button>
      )}
    </ModePageShell>
  );
}

function Row({ e, open, onToggle }: { e: SearchEntry; open: boolean; onToggle: () => void }) {
  return (
    <li className="border-b border-[color:var(--line)] flex items-start">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex-1 min-w-0 text-left py-3 pr-2"
      >
        <RubyText
          text={e.ruby}
          className="block text-[20px] leading-[1.9] text-[color:var(--fg)] break-words"
        />
        <span className="block text-meta text-[color:var(--fg-soft)] break-words">{e.ko}</span>
        <span
          className="block mt-1 text-[11px] tracking-wider text-[color:var(--fg-faint)]"
          style={{ fontFamily: "var(--font-jp-serif)" }}
        >
          {SUBJECT_LABEL[e.subject]}
        </span>
        {open && e.extra.length > 0 && (
          <span className="block mt-2 space-y-1 text-caption text-[color:var(--fg-soft)]">
            {e.extra.map((l, i) => (
              <span key={i} lang="ja" className="block break-words">
                {l}
              </span>
            ))}
          </span>
        )}
      </button>
      <SpeakButton text={e.speak} />
    </li>
  );
}
