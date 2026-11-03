import { createHash } from "node:crypto";

/** Key-sorted JSON so the tag never depends on DB row order. */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, x]) => [k, canon(x)]),
    );
  return v;
}

/** Version tag (strong ETag) of a progress state: sha1 of its canonical JSON. */
export function progressTag(state: unknown): string {
  return `"${createHash("sha1").update(JSON.stringify(canon(state))).digest("hex")}"`;
}

/** Compare tags tolerant of proxies that weaken (W/) or suffix (-gzip) ETags. */
export function sameTag(a: string, b: string): boolean {
  const n = (t: string) => t.trim().replace(/^W\//, "").replace(/-gzip"$/, '"');
  return n(a) === n(b);
}
