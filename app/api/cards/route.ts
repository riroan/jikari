import { getAllKanji, getAllSentences, getAllVocab } from "@/lib/db/cards";

export const dynamic = "force-dynamic";

export async function GET() {
  const [kanji, vocab, sentences] = await Promise.all([
    getAllKanji(),
    getAllVocab(),
    getAllSentences(),
  ]);
  return Response.json({ kanji, vocab, sentences });
}
