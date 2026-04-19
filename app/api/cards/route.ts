import { getAllKanji, getAllSentences, getAllVocab } from "@/lib/db/cards";
import { getAllGrammar } from "@/lib/db/grammar";
import { getAllChapters, getAllChapterMembers } from "@/lib/db/chapters";

export const dynamic = "force-dynamic";

export async function GET() {
  const [kanji, vocab, sentences, grammar, chapters, chapterMembers] =
    await Promise.all([
      getAllKanji(),
      getAllVocab(),
      getAllSentences(),
      // Soft-fail on grammar if the 0007 migration hasn't been applied yet —
      // the app still works for the other 5 modes.
      getAllGrammar().catch((err) => {
        console.warn(`[api/cards] getAllGrammar failed, returning []: ${err}`);
        return [];
      }),
      // Soft-fail on chapters if 0009/0010 migrations haven't run.
      getAllChapters().catch((err) => {
        console.warn(`[api/cards] getAllChapters failed, returning []: ${err}`);
        return [];
      }),
      getAllChapterMembers().catch((err) => {
        console.warn(`[api/cards] getAllChapterMembers failed, returning []: ${err}`);
        return [];
      }),
    ]);
  return Response.json({
    kanji,
    vocab,
    sentences,
    grammar,
    chapters,
    chapterMembers,
  });
}
