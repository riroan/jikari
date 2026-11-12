/** 급단에 따라 문양과 눈금이 자라는 작은 인장. 프로필 테두리 스킨 안에 놓인다. */
export function RankEmblem({ index, name }: { index: number; name: string }) {
  const group = index < 5 ? 0 : index < 10 ? 1 : 2;
  const marks = group === 2 ? 10 : 5;
  const filled = group === 2 ? index - 9 : (index % 5) + 1;

  return (
    <div role="img" aria-label={`${name} 프로필 아이콘`} className="flex h-full w-full flex-col items-center justify-center text-[color:var(--fg)]">
      <svg viewBox="0 0 64 44" className="h-11 w-16 text-[color:var(--accent-progress-text)]" fill="none" aria-hidden="true">
        {group === 0 ? (
          <>
            <path d="M32 37V13M32 29C20 29 16 20 16 11c10 0 16 6 16 18ZM32 24c0-11 6-17 16-17 0 9-4 17-16 17Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M22 38h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        ) : group === 1 ? (
          <>
            <path d="m6 35 17-22 10 13 8-10 17 19H6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="m17 35 7-9m17 9 7-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M16 32a16 16 0 0 1 32 0" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 34h48M13 39h38M32 3v8M12 11l6 6M52 11l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span lang="ja" className="mt-1 text-h2 font-semibold leading-none" style={{ fontFamily: "var(--font-jp-serif)" }}>{name}</span>
      <span aria-hidden="true" className="mt-3 flex gap-1">
        {Array.from({ length: marks }, (_, i) => (
          <span key={i} className={`h-1 w-1 rounded-full ${i < filled ? "bg-[color:var(--accent-progress-text)]" : "bg-[color:var(--line)]"}`} />
        ))}
      </span>
    </div>
  );
}
