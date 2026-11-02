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

describe("speak while speaking", () => {
  test("cancels, then defers speak so Safari does not drop it", () => {
    vi.useFakeTimers();
    const spoken: unknown[] = [];
    const cancel = vi.fn();
    vi.stubGlobal("window", {
      speechSynthesis: { speaking: true, getVoices: () => [], cancel, speak: (u: unknown) => spoken.push(u) },
    });
    vi.stubGlobal("SpeechSynthesisUtterance", function (this: object) {});
    speak("こんにちは");
    expect(cancel).toHaveBeenCalled();
    expect(spoken).toHaveLength(0);
    vi.advanceTimersByTime(100);
    expect(spoken).toHaveLength(1);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
