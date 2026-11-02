import { gzipSync } from "node:zlib";

// Next's standalone server doesn't compress route handlers, so do it here.
// ponytail: single-entry memo (same body -> same buffer); only /api/cards is large enough to matter.
let memo: { body: string; gz: Buffer } | null = null;

function gzipCached(body: string): Buffer {
  if (memo?.body !== body) memo = { body, gz: gzipSync(body) };
  return memo.gz;
}

/**
 * JSON response, gzipped when the client accepts it. With `etag`, serves 304
 * on If-None-Match; the gzip variant gets its own ETag suffix.
 */
export function jsonResponse(req: Request, body: string, etag?: string): Response {
  const gzip = /\bgzip\b/i.test(req.headers.get("accept-encoding") ?? "");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Vary: "Accept-Encoding",
  };
  if (etag) {
    const tag = gzip ? `${etag.slice(0, -1)}-gzip"` : etag;
    headers.ETag = tag;
    headers["Cache-Control"] = "private, no-cache";
    if (req.headers.get("if-none-match") === tag) {
      return new Response(null, { status: 304, headers: { ETag: tag, Vary: "Accept-Encoding", "Cache-Control": headers["Cache-Control"] } });
    }
  }
  if (!gzip) return new Response(body, { headers });
  headers["Content-Encoding"] = "gzip";
  return new Response(new Uint8Array(gzipCached(body)), { headers });
}
