"use client";

import { useIsClient } from "@/lib/use-is-client";
import { ChapterMastery, type ChapterSort } from "@/components/ChapterMastery";
import { ModePageShell } from "@/components/ModePageShell";
import { useLocalPref } from "@/lib/use-local-pref";

const SORT_OPTIONS: { id: ChapterSort; label: string }[] = [
  { id: "default", label: "기본" },
  { id: "mastery-asc", label: "약한 순" },
  { id: "due-desc", label: "복습 순" },
];

const isValidSort = (raw: string): raw is ChapterSort =>
  raw === "default" || raw === "mastery-asc" || raw === "due-desc";

export default function ChaptersPage() {
  const mounted = useIsClient();
  // Lives in localStorage rather than the remote progress store: this is
  // a UI ergonomic, not learning data, and the DB schema doesn't carry it.
  const [sort, setSort] = useLocalPref<ChapterSort>(
    "jikari-chapter-sort",
    "default",
    isValidSort,
  );

  return (
    <ModePageShell title="単元">
      <SortChoice value={sort} onChange={setSort} />
      <ChapterMastery mounted={mounted} sort={sort} />
    </ModePageShell>
  );
}

function SortChoice({
  value,
  onChange,
}: {
  value: ChapterSort;
  onChange: (next: ChapterSort) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="챕터 정렬"
      className="mb-4 inline-flex border border-[color:var(--line)] rounded-sm overflow-hidden"
    >
      {SORT_OPTIONS.map((o, i) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={`px-3 py-1.5 text-caption tracking-wide min-h-[36px] transition-colors ${
              i > 0 ? "border-l border-[color:var(--line)]" : ""
            } ${
              active
                ? "bg-[color:var(--bg-deep)] text-[color:var(--fg)]"
                : "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
