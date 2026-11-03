// Service worker, served from /sw.js. A route handler (not public/) so the build id is baked in:
// every deploy yields a new SW script and a new cache name, and old caches are deleted on activate.
export const dynamic = "force-static";

const SW = String.raw`
const V = "__BUILD__";
const STATIC = "jikari-static-" + V; // cache-first, content-hashed or rarely changing
const RT = "jikari-rt-" + V; // network-first / SWR: HTML, /api/cards, /api/progress
const SNAPSHOT_HEADER = "X-Jikari-Offline-Snapshot";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) {
        if (k.startsWith("jikari-") && k !== STATIC && k !== RT) await caches.delete(k);
      }
      await self.clients.claim();
    })(),
  ),
);

const okToCache = (res) => res && (res.ok || res.type === "opaque") && !res.redirected;

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (okToCache(res)) cache.put(req, res.clone());
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
  try {
    const hasCopy = !!(await cache.match(key));
    const res = await (hasCopy ? withTimeout(fetch(req), ms) : fetch(req));
    if (res.ok && !res.redirected) cache.put(key, res.clone());
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
    throw err;
  }
}

// Stale-while-revalidate. The browser HTTP cache turns the ETag 304 into a 200 for this fetch, so we always cache a full 200 body.
async function swr(req, key, event) {
  const cache = await caches.open(RT);
  const hit = await cache.match(key);
  const refresh = fetch(req).then((res) => {
    if (res.ok) cache.put(key, res.clone());
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
  if (req.method !== "GET") return; // never touch PUT/POST
  const url = new URL(req.url);
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
    event.respondWith(networkFirst(req, key, 4000, [new Request(url.origin + "/")], false));
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
