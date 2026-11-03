# Offline

Goal: study on the subway. Answers are never lost; the app opens without a connection.

## Pending write (lib/remote-storage.ts)
- Every store write is mirrored to `localStorage["jikari-pending-v1"]` (`{v, base, value}`) and removed after a successful PUT.
- Status line: `저장 대기 중…` survives reloads while the copy exists; `오프라인 — 풀이는 저장돼요` when offline with a copy.
- After a **fresh** `GET /api/progress` succeeds, the server copy and the pending copy are merged (lib/merge-state.ts) and PUT once. The 57bb895 guard stands: nothing is written before a fresh GET succeeded.
- A permanently rejected (4xx) payload is moved to `jikari-pending-rejected-v1` instead of being re-merged forever.

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
