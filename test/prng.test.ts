import { describe, expect, test } from "vitest";
import { seededRandom, seededShuffle } from "@/lib/prng";
import { generateChoices } from "@/lib/data";

describe("seededRandom / seededShuffle", () => {
  test("같은 시드는 같은 수열, 소수 시드도 결정적", () => {
    expect(seededRandom(42)()).toBe(seededRandom(42)());
    expect(seededRandom(0.123)()).toBe(seededRandom(0.123)());
    expect(seededRandom(0.123)()).not.toBe(seededRandom(0.124)());
  });

  test("입력 배열을 바꾸지 않고 원소를 보존한다", () => {
    const src = [1, 2, 3, 4, 5];
    const out = seededShuffle(src, 7);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test("정답 위치가 고르다", () => {
    const n = 8000;
    const hits = [0, 0, 0, 0];
    for (let s = 0; s < n; s++) {
      hits[generateChoices("A", ["B", "C", "D"], s).choices.indexOf("A")]++;
    }
    for (const h of hits) expect(Math.abs(h / n - 0.25)).toBeLessThan(0.03);
  });

  // 페이지는 문제마다 seed + index를 넘긴다. 옛 LCG는 이 경우 직전과 같은
  // 위치가 54%였다 (우연이면 25%).
  test("이어지는 시드에서 직전 문제와 같은 정답 위치 비율이 우연 수준", () => {
    let same = 0;
    let pairs = 0;
    for (let base = 0; base < 400; base++) {
      let prev = -1;
      for (let i = 0; i < 20; i++) {
        const p = generateChoices("A", ["B", "C", "D"], base * 1000 + i).choices.indexOf("A");
        if (prev >= 0) {
          pairs++;
          if (p === prev) same++;
        }
        prev = p;
      }
    }
    expect(Math.abs(same / pairs - 0.25)).toBeLessThan(0.03);
  });
});
