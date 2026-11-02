import { createHash } from "node:crypto";
import { jsonResponse } from "@/lib/gzip-response";
import { getAllKanji, getAllSentences, getAllVocab } from "@/lib/db/cards";
import { getAllGrammar } from "@/lib/db/grammar";
import { getAllChapters, getAllChapterMembers } from "@/lib/db/chapters";
import { getAllExpressions } from "@/lib/db/expressions";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const [
    kanji,
    vocab,
    sentences,
    grammar,
    chapters,
    chapterMembers,
    expressions,
  ] = await Promise.all([
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
    // Soft-fail on expressions if 0011 migration hasn't run — other 7 subjects
    // keep working while the 일상표현 table is absent.
    getAllExpressions().catch((err) => {
      console.warn(`[api/cards] getAllExpressions failed, returning []: ${err}`);
      return [];
    }),
  ]);
  const body = JSON.stringify({
    kanji,
    vocab,
    sentences,
    grammar,
    chapters,
    chapterMembers,
    expressions,
  });
  // ETag lets the browser revalidate with a tiny 304 instead of re-downloading
  // the whole deck on every load.
  const etag = `"${createHash("sha1").update(body).digest("base64url")}"`;
  return jsonResponse(req, body, etag);
}
