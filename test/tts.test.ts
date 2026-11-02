import { describe, expect, test, vi } from "vitest";
import { speak } from "@/lib/tts";

describe("speak rate", () => {
  test("defaults to 0.9, accepts override", () => {
    const spoken: { rate: number }[] = [];
    vi.stubGlobal("window", {
      speechSynthesis: {
        getVoices: () => [],
        cancel: () => {},
        speak: (u: { rate: number }) => spoken.push(u),
      },
    });
    vi.stubGlobal("SpeechSynthesisUtterance", function (this: object, t: string) {
      Object.assign(this, { text: t });
    });
    speak("こんにちは");
    speak("こんにちは", 0.6);
    expect(spoken.map((u) => u.rate)).toEqual([0.9, 0.6]);
    vi.unstubAllGlobals();
  });
});
