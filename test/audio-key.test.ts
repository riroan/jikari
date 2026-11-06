import { describe, it, expect } from "vitest";
import { AUDIO_KEY_RE, audioKey, isReportable } from "@/lib/audio-key";
import { toSpeakable } from "@/lib/tts";

describe("audioKey", () => {
  it("같은 평문 → 같은 키, 다른 문장 → 다른 키, API 경로 형식", () => {
    const k = audioKey("ありがとう");
    expect(audioKey("ありがとう")).toBe(k);
    expect(audioKey("ありがと")).not.toBe(k);
    expect(k).toMatch(AUDIO_KEY_RE);
  });

  it("루비·강조 마크업은 벗긴 평문 기준이라 표기가 달라도 같은 클립", () => {
    expect(audioKey(toSpeakable("{食|た}べる"))).toBe(audioKey(toSpeakable("[[食べる]]")));
  });
});

describe("isReportable", () => {
  it("한자가 든 일본어만 신고 — 가나만(숫자 듣기)·마크업·너무 긴 글은 거른다", () => {
    expect(isReportable("今日は雨です")).toBe(true);
    expect(isReportable("さんぜんごひゃくえん")).toBe(false);
    expect(isReportable("<script>")).toBe(false);
    expect(isReportable("日".repeat(201))).toBe(false);
  });
});
