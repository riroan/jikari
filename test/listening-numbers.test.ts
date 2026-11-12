import { describe, it, expect } from "vitest";
import { NUM_KINDS, makeNumQuiz, readDate, readNumber, readTime, readYen } from "@/lib/listening-numbers";
import { MINIMAL_PAIRS } from "@/lib/minimal-pairs";

describe("숫자 읽기", () => {
  it("음편 (さんびゃく·ろっぴゃく·はっせん·まん)", () => {
    expect(readNumber(300)).toBe("さんびゃく");
    expect(readNumber(680)).toBe("ろっぴゃくはちじゅう");
    expect(readNumber(8000)).toBe("はっせん");
    expect(readNumber(3580)).toBe("さんぜんごひゃくはちじゅう");
    expect(readNumber(12000)).toBe("いちまんにせん");
    expect(readYen(4)).toBe("よえん");
    expect(readYen(1300)).toBe("せんさんびゃくえん");
  });

  it("시각: よじ·しちじ·くじ, ふん/ぷん", () => {
    expect(readTime(4, 0)).toBe("よじ");
    expect(readTime(7, 15)).toBe("しちじじゅうごふん");
    expect(readTime(9, 10)).toBe("くじじゅっぷん");
    expect(readTime(12, 46)).toBe("じゅうにじよんじゅうろっぷん");
  });

  it("날짜: 특수 읽기", () => {
    expect(readDate(4, 8)).toBe("しがつようか");
    expect(readDate(1, 1)).toBe("いちがつついたち");
    expect(readDate(7, 20)).toBe("しちがつはつか");
    expect(readDate(9, 14)).toBe("くがつじゅうよっか");
    expect(readDate(11, 17)).toBe("じゅういちがつじゅうしちにち");
    expect(readDate(12, 29)).toBe("じゅうにがつにじゅうくにち");
  });
});

describe("makeNumQuiz", () => {
  it("모든 종류·시드에서 오답 3개가 서로 다르고 정답과 겹치지 않는다", () => {
    for (const kind of NUM_KINDS)
      for (let seed = 0; seed < 300; seed++) {
        const q = makeNumQuiz(kind, seed);
        expect(q.distractors).toHaveLength(3);
        expect(new Set([q.answer, ...q.distractors]).size).toBe(4);
        expect(q.reading).toMatch(/^[ぁ-ん]+$/);
      }
  });

  it("같은 시드 → 같은 문제 (다시 풀기가 같은 수를 묻는다)", () => {
    expect(makeNumQuiz("price", 42)).toEqual(makeNumQuiz("price", 42));
  });
});

describe("MINIMAL_PAIRS", () => {
  it("id가 유일하고 두 단어의 가나가 다르다", () => {
    expect(new Set(MINIMAL_PAIRS.map((p) => p.id)).size).toBe(MINIMAL_PAIRS.length);
    for (const p of MINIMAL_PAIRS) expect(p.a.kana).not.toBe(p.b.kana);
  });
});
