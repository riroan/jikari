"use client";

import { useEffect, useState } from "react";
import { ChapterMastery } from "@/components/ChapterMastery";
import { ModePageShell } from "@/components/ModePageShell";

export default function ChaptersPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <ModePageShell title="単元">
      <ChapterMastery mounted={mounted} />
    </ModePageShell>
  );
}
