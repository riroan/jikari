"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";

const ITEMS = [
  { href: "/profile", ko: "프로필", jp: "プロフィール" },
  { href: "/rewards", ko: "보상", jp: "褒美" },
  { href: "/progress", ko: "진도", jp: "進捗" },
  { href: "/search", ko: "검색", jp: "検索" },
  { href: "/settings", ko: "설정", jp: "設定" },
] as const;

const rowClass =
  "flex items-center justify-between gap-6 min-h-11 px-4 text-small text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)]";

/** 홈 좌상단 메뉴 — 예전 하단 내비(PROGRESS·検索·SETTINGS·테마)와 프로필·보상을 모은다. */
export function HomeMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative mr-3 -ml-2">
      <button
        type="button"
        aria-label="메뉴"
        aria-expanded={open}
        aria-controls="home-menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-11 h-11 text-[color:var(--fg-soft)] hover:text-[color:var(--fg)]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <>
          {/* 바깥을 누르면 닫힌다 */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <nav
            id="home-menu"
            aria-label="메뉴"
            className="absolute left-0 top-full mt-1 z-50 w-[13rem] whitespace-nowrap py-1 bg-[color:var(--bg)] border border-[color:var(--line)] rounded-sm"
          >
            {ITEMS.map((it) => (
              <Link key={it.href} href={it.href} className={rowClass} onClick={() => setOpen(false)}>
                <span>{it.ko}</span>
                <span lang="ja" className="text-caption text-[color:var(--fg-faint)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
                  {it.jp}
                </span>
              </Link>
            ))}
            <div className={`${rowClass} border-t border-[color:var(--line)] hover:bg-transparent`}>
              <span>테마</span>
              <ThemeCycleButton className="min-h-11 text-caption text-[color:var(--fg-soft)] hover:text-[color:var(--fg)]" />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
