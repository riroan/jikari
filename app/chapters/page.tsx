"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChapterMastery } from "@/components/ChapterMastery";

export default function ChaptersPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-8">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <h1
            className="text-[22px] leading-none font-semibold tracking-tab text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            単元
          </h1>
        </header>

        <ChapterMastery mounted={mounted} />
      </div>
    </main>
  );
}
