import { nonJoyoChars } from "../lib/joyo";

/**
 * Exit before touching the DB if any card's Japanese uses a kanji outside the
 * 常用漢字表 (CLAUDE.md content rule). `--allow-non-joyo` overrides for a
 * deliberate exception. Shared by the add-* scripts.
 */
export function refuseNonJoyo(items: { id: string; text: string }[]): void {
  const problems = items.flatMap(({ id, text }) => nonJoyoChars(text).map((c) => `${id}: ${c}`));
  if (problems.length === 0 || process.argv.includes("--allow-non-joyo")) return;
  console.error(`상용한자 밖 글자 ${problems.length}개 — import하지 않습니다:\n  ${problems.slice(0, 30).join("\n  ")}`);
  console.error("가나로 바꾸거나 상용한자로 쓰세요. 의도한 것이면 --allow-non-joyo.");
  process.exit(1);
}
