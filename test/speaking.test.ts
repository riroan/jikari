import { describe, expect, it } from "vitest";
import { judgeSpeech, similarity } from "@/lib/speaking";

const R = "おつかれさまでした";
const T = "お疲れ様でした。";

describe("judgeSpeech", () => {
  it("exact: kana, katakana, punctuation/spaces ignored", () => {
    expect(judgeSpeech(["おつかれさまでした"], R, T).tier).toBe("exact");
    expect(judgeSpeech(["オツカレ サマ デシタ。"], R, T).tier).toBe("exact");
  });
  it("exact: kanji transcript matches written text", () => {
    expect(judgeSpeech(["お疲れ様でした"], R, T).tier).toBe("exact");
  });
  it("any of the alternatives counts", () => {
    expect(judgeSpeech(["おはよう", "お疲れ様でした", "x"], R, T).tier).toBe("exact");
  });
  it("close: one char off in a long phrase", () => {
    const j = judgeSpeech(["おつかれさまでしだ"], R, T);
    expect(j.tier).toBe("close");
    expect(j.heard).toBe("おつかれさまでしだ");
    expect(j.diff.filter((d) => !d.ok).length).toBe(1);
  });
  it("miss: unrelated", () => {
    expect(judgeSpeech(["こんにちは"], R, T).tier).toBe("miss");
  });
  it("short phrase one char off is a miss (below 0.8)", () => {
    expect(judgeSpeech(["ありがと"], "ありがとう", "ありがとう").tier).toBe("close");
    expect(judgeSpeech(["あり"], "ありがとう", "ありがとう").tier).toBe("miss");
  });
  it("empty / blank alternatives are a miss with empty heard", () => {
    expect(judgeSpeech([], R, T)).toMatchObject({ tier: "miss", heard: "" });
    expect(judgeSpeech(["", " 。"], R, T).tier).toBe("miss");
  });
  it("kanji transcript is not compared as kana-only mismatch", () => {
    expect(similarity("お疲れ様でした", T)).toBe(1);
  });
});
