# Offline

Goal: study on the subway. Answers are never lost; the app opens without a connection.

## Pending write (lib/remote-storage.ts)
- Every store write is mirrored to `localStorage["jikari-pending-v1"]` (`{v, base, value}`) and removed after a successful PUT.
- Status line: `저장 대기 중…` survives reloads while the copy exists; `오프라인 — 풀이는 저장돼요` when offline with a copy.
- After a **fresh** `GET /api/progress` succeeds, the server copy and the pending copy are merged (lib/merge-state.ts) and PUT once. The 57bb895 guard stands: nothing is written before a fresh GET succeeded.
- A permanently rejected (4xx) payload is moved to `jikari-pending-rejected-v1` instead of being re-merged forever.

## Save protocol (optimistic concurrency, no schema change)
- Version tag = sha1 of the canonical (key-sorted) JSON of what `GET /api/progress` returns, sent as `ETag` on GET and on every successful PUT (lib/progress-tag.ts; GET reads one consistent DB snapshot).
- The client remembers the last tag it saw (GET or PUT) and sends it as `If-Match` on PUT. No tag (offline snapshot, old server) -> no header.
- Server (`putProgress`): takes a named DB lock (`GET_LOCK`) so PUTs serialize, re-reads the current state inside the transaction and compares tags. Equal (or no `If-Match`: old clients keep working) -> DELETE+INSERT, answer 200 + new ETag. Different -> nothing written, **409** + current state + its ETag.
- Client on 409: merge(server state, our pending value) with the usual rules, adopt the new tag, PUT again immediately (max 5 in a row, then normal backoff), and fire `jikari:merged` so HydrationBoundary re-hydrates the in-memory store from the merge (otherwise the next answer would be built on the stale store and undo the other device's work). The pending copy is deleted only after a 2xx.
- Other 4xx: payload dropped (kept once in `jikari-pending-rejected-v1`, which replaces the pending copy rather than doubling it).
- **Replace** (backup restore / reset in Settings, after the user's explicit confirm): `markReplaceNext()` flags the pending envelope `replace: true`. It is sent as-is, never merged — also after a reload (`loadAndMerge` skips the merge and uses the freshest GET tag). On 409 for a replace the client only re-GETs the tag (no merge) and retries once, then backs off. Cleared after the replace is saved; later writes merge normally.
- Snapshot (offline) mode: the queue is mirrored in memory (`memEnv`); if `localStorage` throws (quota/private mode), the in-memory copy wins over the stale stored one and the status line says `저장 공간이 부족해요 — 연결되면 바로 저장해요` (the queue is then lost if the tab closes).

## Merge rules (server S, local L)
| field | rule |
|---|---|
| learningStates | union by key; same key: larger `lastReviewed` wins (ties: nextDue, box, streak) |
| heatmap | union by day, per-day max |
| lastActiveAt | max |
| currentStreak | recomputed from the merged heatmap as of the merged lastActiveAt (a stale copy's number never wins) |
| quizStats | union; per-field max (no double count of the shared base; undercounts if both sides answered independently) |
| ratings | union; same mode: local wins only if it differs from the server ratings it was based on (`baseRatings` in the envelope), else S. No base -> S. Both devices rating the same mode: the flushing one wins |
| settings | 3-way per field vs the settings L was based on: locally changed field wins, else S |
Counters are max-merged, not summed: if two devices study on the same day, the heatmap day count and quizStats fields are the larger of the two, so they **under-count** (accepted; summing would double-count the shared base without per-device deltas).
Merge never deletes ids. Known limit: a "reset" done offline is resurrected from S.

## Service worker (app/sw.js/route.ts, production builds only)
- Cache names carry the build id (`next.config.ts`), old caches are deleted on activate.
- `/_next/static/*`, icons, manifest, jsdelivr Pretendard: cache-first.
- Navigations: network-first (4s timeout when a copy exists), fallback to that route's last HTML, else `/`.
- `GET /api/cards`: stale-while-revalidate (200 bodies only; ETag/304 stays with the browser HTTP cache).
- `GET /api/progress`: network-first, fallback to the last good copy marked `X-Jikari-Offline-Snapshot: 1`.
  In snapshot mode the store is usable but **never saves over the server**: answers only queue in localStorage;
  when online again the app re-GETs, merges and PUTs once.
- PUT/POST are never touched. Snapshot may be older than the server (answers PUT after the last GET are not in it); the merge handles that.

## Reset
`?nosw=1` on any URL: unregisters the SW, deletes caches, stays off (remembered). `?nosw=0` re-enables.
iPhone: Settings → Safari → Advanced → Website Data → remove the site.
