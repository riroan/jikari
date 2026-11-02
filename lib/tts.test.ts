import { describe, expect, it } from "vitest";
import { toSpeakable } from "./tts";

describe("toSpeakable", () => {
  it("strips ruby and highlight markup", () => {
    expect(toSpeakable("{食|た}べる")).toBe("食べる");
    expect(toSpeakable("[[{行|い}かなければ]]ならない")).toBe("行かなければならない");
  });
  it("handles empty / plain", () => {
    expect(toSpeakable("")).toBe("");
    expect(toSpeakable(" ありがとう ")).toBe("ありがとう");
  });
});
