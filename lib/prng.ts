/**
 * 시드 기반 의사난수. 결정적이고(같은 시드 → 같은 수열) 이어지는 시드끼리
 * 상관이 없다.
 *
 * 예전에는 `s * 9301 + 49297 mod 233280` LCG를 썼는데, 페이지들이 문제마다
 * `seed + index`를 시드로 넘기기 때문에 첫 난수가 시드와 함께 규칙적으로
 * 움직여서 연속 문제의 정답 위치가 닮았다 (직전과 같은 번호일 확률 54%,
 * 우연이면 25%). 시드를 먼저 해시로 섞고 mulberry32로 뽑는다.
 */

/** 정수든 소수(Math.random())든 32비트 상태 하나로 접는다. */
function seedToState(seed: number): number {
  const whole = Math.floor(seed);
  const frac = Math.floor((seed - whole) * 4294967296);
  let h = (whole | 0) ^ Math.imul(frac | 0, 0x85ebca6b);
  // murmur3 finalizer — 한 비트 차이도 전체 비트로 퍼뜨린다.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** [0, 1)을 돌려주는 함수. mulberry32. */
export function seededRandom(seed: number): () => number {
  let a = seedToState(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates. 입력은 건드리지 않는다. */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const copy = arr.slice();
  const rand = seededRandom(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
