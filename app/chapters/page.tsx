"use client";

import { useIsClient } from "@/lib/use-is-client";
import { ChapterMastery } from "@/components/ChapterMastery";
import { ModePageShell } from "@/components/ModePageShell";

export default function ChaptersPage() {
  const mounted = useIsClient();

  return (
    <ModePageShell title="単元">
      <ChapterMastery mounted={mounted} />
    </ModePageShell>
  );
}
