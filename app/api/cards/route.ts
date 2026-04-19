import { getAllKanji, getAllSentences, getAllVocab } from "@/lib/db/cards";
import { getAllGrammar } from "@/lib/db/grammar";

export const dynamic = "force-dynamic";

export async function GET() {
  const [kanji, vocab, sentences, grammar] = await Promise.all([
    getAllKanji(),
    getAllVocab(),
    getAllSentences(),
    // Soft-fail on grammar if the 0007 migration hasn't been applied yet —
    // the app still works for the other 5 modes.
    getAllGrammar().catch((err) => {
      console.warn(`[api/cards] getAllGrammar failed, returning []: ${err}`);
      return [];
    }),
  ]);
  return Response.json({ kanji, vocab, sentences, grammar });
}
