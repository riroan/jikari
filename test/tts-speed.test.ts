import { afterEach, describe, expect, it, vi } from "vitest";
import { SPEED_KEY, SPEED_RATES, clampRate, currentRate, getSpeechSpeed } from "@/lib/tts-speed";

function stubStorage(impl: Partial<Storage>) {
  vi.stubGlobal("localStorage", impl);
}
afterEach(() => vi.unstubAllGlobals());

describe("speech speed pref", () => {
  it("defaults to normal when unset", () => {
    stubStorage({ getItem: () => null });
    expect(getSpeechSpeed()).toBe("normal");
    expect(currentRate()).toBe(SPEED_RATES.normal);
  });
  it("reads a persisted slow value", () => {
    stubStorage({ getItem: (k) => (k === SPEED_KEY ? "slow" : null) });
    expect(getSpeechSpeed()).toBe("slow");
    expect(currentRate()).toBe(SPEED_RATES.slow);
  });
  it("ignores garbage values", () => {
    stubStorage({ getItem: () => "turbo" });
    expect(getSpeechSpeed()).toBe("normal");
  });
  it("falls back to normal when storage throws", () => {
    stubStorage({
      getItem: () => {
        throw new Error("denied");
      },
    });
    expect(getSpeechSpeed()).toBe("normal");
  });
  it("clamps rates to a speakable range", () => {
    expect(clampRate(0.1)).toBe(0.5);
    expect(clampRate(9)).toBe(1.5);
    expect(clampRate(0.7)).toBe(0.7);
    expect(clampRate(NaN)).toBe(SPEED_RATES.normal);
  });
});
