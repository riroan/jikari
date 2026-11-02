import { describe, it, expect } from "vitest";
import { pickMimeType, shadowReducer, shadowMessage, type ShadowState } from "./shadow";

describe("pickMimeType", () => {
  it("prefers mp4 on iOS-like support", () => {
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });
  it("falls back to webm", () => {
    expect(pickMimeType((t) => t.startsWith("audio/webm"))).toBe("audio/webm;codecs=opus");
  });
  it("undefined when nothing or no checker", () => {
    expect(pickMimeType(() => false)).toBeUndefined();
    expect(pickMimeType()).toBeUndefined();
  });
});

describe("shadowReducer", () => {
  const idle: ShadowState = { kind: "idle" };
  it("idle -> recording -> recorded -> playing -> recorded", () => {
    let s = shadowReducer(idle, { type: "start" });
    expect(s.kind).toBe("recording");
    s = shadowReducer(s, { type: "stop" });
    expect(s.kind).toBe("recorded");
    s = shadowReducer(s, { type: "play" });
    expect(s.kind).toBe("playing");
    s = shadowReducer(s, { type: "ended" });
    expect(s.kind).toBe("recorded");
  });
  it("ignores invalid transitions", () => {
    expect(shadowReducer(idle, { type: "play" })).toBe(idle);
    expect(shadowReducer(idle, { type: "stop" })).toBe(idle);
  });
  it("error and reset", () => {
    const e = shadowReducer({ kind: "recording" }, { type: "error", reason: "denied" });
    expect(shadowMessage(e)).toContain("권한");
    expect(shadowReducer(e, { type: "reset" })).toEqual(idle);
  });
  it("recording message", () => {
    expect(shadowMessage({ kind: "recording" })).toBe("녹음 중…");
  });
});
