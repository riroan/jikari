import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { jsonResponse } from "./gzip-response";

const req = (h: Record<string, string> = {}) => new Request("http://x/", { headers: h });
const body = JSON.stringify({ a: "あ".repeat(500) });

describe("jsonResponse", () => {
  it("gzips when accepted and round-trips", async () => {
    const res = jsonResponse(req({ "accept-encoding": "gzip, br" }), body);
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    expect(gunzipSync(Buffer.from(await res.arrayBuffer())).toString()).toBe(body);
  });
  it("is identity without Accept-Encoding", async () => {
    const res = jsonResponse(req(), body);
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(body);
  });
  it("ETag differs per encoding and 304s on match", () => {
    const e = '"abc"';
    const plain = jsonResponse(req(), body, e);
    const gz = jsonResponse(req({ "accept-encoding": "gzip" }), body, e);
    expect(plain.headers.get("etag")).toBe(e);
    expect(gz.headers.get("etag")).not.toBe(e);
    const hit = jsonResponse(req({ "accept-encoding": "gzip", "if-none-match": gz.headers.get("etag")! }), body, e);
    expect(hit.status).toBe(304);
    // identity validator must not match the gzip representation
    expect(jsonResponse(req({ "accept-encoding": "gzip", "if-none-match": e }), body, e).status).toBe(200);
  });
  it("uncached (no etag) responses do not evict the memoised one", async () => {
    const gz = { "accept-encoding": "gzip" };
    const a = Buffer.from(await jsonResponse(req(gz), body, '"a"').arrayBuffer());
    await jsonResponse(req(gz), body + " ").arrayBuffer();
    const b = Buffer.from(await jsonResponse(req(gz), body, '"a"').arrayBuffer());
    expect(b.equals(a)).toBe(true);
    expect(gunzipSync(b).toString()).toBe(body);
  });
});
