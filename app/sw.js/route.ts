// Service worker, served from /sw.js. A route handler (not public/) so the build id is baked in:
// every deploy yields a new SW script and a new cache name, and old caches are deleted on activate.
export const dynamic = "force-static";

const SW = String.raw`
const V = "__BUILD__";
const STATIC = "jikari-static-" + V; // cache-first, content-hashed or rarely changing
const RT = "jikari-rt-" + V; // network-first / SWR: HTML, /api/cards, /api/progress
const SNAPSHOT_HEADER = "X-Jikari-Offline-Snapshot";

self.addEventListener("install", () => self.skipWaiting());
// Keep exactly the current + previous build's caches (meta cache = ordered build ids). A stale cached HTML
// (network-first timed out) may still lazy-load chunks of the previous build: cacheFirst falls back to those.
const META = "jikari-meta";
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      const meta = await caches.open(META);
      const hit = await meta.match("/builds");
      let ids = hit ? await hit.json().catch(() => []) : [];
      if (!Array.isArray(ids)) ids = [];
      if (ids[ids.length - 1] !== V) ids.push(V);
      ids = ids.slice(-2);
      await meta.put("/builds", new Response(JSON.stringify(ids)));
      const keep = new Set([META, ...ids.flatMap((id) => ["jikari-static-" + id, "jikari-rt-" + id])]);
      for (const k of await caches.keys()) {
        if (k.startsWith("jikari-") && !keep.has(k)) await caches.delete(k);
      }
      await self.clients.claim();
    })(),
  ),
);

const okToCache = (res) => res && res.status === 200 && res.type !== "opaque" && !res.redirected;

async function oldStatic(req) {
  for (const k of await caches.keys()) {
    if (k.startsWith("jikari-static-") && k !== STATIC) {
      const hit = await (await caches.open(k)).match(req);
      if (hit) return hit;
    }
  }
}

async function cacheFirst(req) {
  if (req.headers.has("range")) return fetch(req); // partial responses are never cached
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  let res;
  try {
    res = await fetch(req);
  } catch (err) {
    const old = await oldStatic(req);
    if (old) return old;
    throw err;
  }
  if (okToCache(res)) cache.put(req, res.clone()).catch(() => {});
  else if (res.status === 404) return (await oldStatic(req)) || res;
  return res;
}

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

// Network first; on failure/timeout serve the last good copy (if any). Only 2xx bodies are cached.
async function networkFirst(req, key, ms, fallbackKeys, mark) {
  const cache = await caches.open(RT);
  let bad;
  try {
    const hasCopy = !!(await cache.match(key));
    const res = await (hasCopy ? withTimeout(fetch(req), ms) : fetch(req));
    if (res.status >= 500) {
      bad = res;
      throw new Error("5xx");
    }
    if (res.ok && !res.redirected) cache.put(key, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    for (const k of [key, ...fallbackKeys]) {
      const hit = await cache.match(k);
      if (hit) {
        if (!mark) return hit;
        const h = new Headers(hit.headers);
        h.set(SNAPSHOT_HEADER, "1");
        return new Response(hit.body, { status: 200, headers: h });
      }
    }
    if (bad) return bad;
    throw err;
  }
}

// After a PUT the cached snapshot must follow the server, or an offline reopen shows pre-answer data.
async function putProgress(req) {
  const body = await req.clone().text();
  const res = await fetch(req);
  const cache = await caches.open(RT);
  const key = new Request(self.location.origin + "/api/progress");
  const snap = async (text) => {
    const h = { "Content-Type": "application/json" };
    const tag = res.headers.get("ETag");
    if (tag) h.ETag = tag;
    await cache.put(key, new Response(text, { headers: h })).catch(() => {});
  };
  try {
    if (res.ok) await snap(body);
    else if (res.status === 409) await snap(await res.clone().text());
    else if (res.status >= 400 && res.status < 500) await cache.delete(key);
  } catch {}
  return res;
}

const OFFLINE_PAGE =
  '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>offline</title></head>' +
  '<body style="font-family:Pretendard,sans-serif;padding:2rem;line-height:1.6"><p>offline: 이 화면은 아직 저장되지 않았어요 — 연결되면 열려요</p><p><a href="/">/ 로 돌아가기</a></p></body></html>';

// Stale-while-revalidate. The browser HTTP cache turns the ETag 304 into a 200 for this fetch, so we always cache a full 200 body.
async function swr(req, key, event) {
  const cache = await caches.open(RT);
  const hit = await cache.match(key);
  const refresh = fetch(req).then((res) => {
    if (res.ok) cache.put(key, res.clone()).catch(() => {});
    return res;
  });
  if (hit) {
    event.waitUntil(refresh.catch(() => {}));
    return hit;
  }
  return refresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === "PUT" && url.origin === self.location.origin && url.pathname === "/api/progress") {
    event.respondWith(putProgress(req)); // the only non-GET we touch; its response is never cached
    return;
  }
  if (req.method !== "GET") return; // never touch other PUT/POST
  if (url.searchParams.has("nosw")) return;

  if (url.origin === "https://cdn.jsdelivr.net") {
    event.respondWith(cacheFirst(req)); // Pretendard css + font slices
    return;
  }
  if (url.origin !== self.location.origin) return;

  const p = url.pathname;
  if (p === "/api/cards") {
    event.respondWith(swr(req, new Request(url.origin + p), event));
  } else if (p === "/api/progress") {
    event.respondWith(networkFirst(req, new Request(url.origin + p), 4000, [], true));
  } else if (p.startsWith("/api/") || p === "/sw.js") {
    return;
  } else if (p.startsWith("/_next/static/") || p === "/icon" || p === "/apple-icon" || p === "/favicon.ico" || p === "/manifest.webmanifest") {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    const key = new Request(url.origin + p);
    event.respondWith(
      networkFirst(req, key, 4000, [], false).catch(
        () => new Response(OFFLINE_PAGE, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }),
      ),
    );
  }
});
`;

export function GET() {
  return new Response(SW.replace("__BUILD__", process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"), {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
