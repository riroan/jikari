/** Pure helpers for 따라 말하기 (shadowing): recorder mime choice + UI state machine. */

// iOS Safari records audio/mp4 (aac); Chrome/Firefox prefer webm/opus.
const MIME_CANDIDATES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

/** First supported mime, or undefined to let the browser pick its default. */
export function pickMimeType(isSupported?: (t: string) => boolean): string | undefined {
  if (!isSupported) return undefined;
  return MIME_CANDIDATES.find((t) => isSupported(t));
}

export type ShadowState =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "recorded" }
  | { kind: "playing" }
  | { kind: "error"; reason: "denied" | "unsupported" | "failed" };

export type ShadowEvent =
  | { type: "start" }
  | { type: "stop" }
  | { type: "play" }
  | { type: "ended" }
  | { type: "error"; reason: "denied" | "unsupported" | "failed" }
  | { type: "reset" };

export function shadowReducer(s: ShadowState, e: ShadowEvent): ShadowState {
  switch (e.type) {
    case "start":
      return s.kind === "recording" ? s : { kind: "recording" };
    case "stop":
      return s.kind === "recording" ? { kind: "recorded" } : s;
    case "play":
      return s.kind === "recorded" ? { kind: "playing" } : s;
    case "ended":
      return s.kind === "playing" ? { kind: "recorded" } : s;
    case "error":
      return { kind: "error", reason: e.reason };
    case "reset":
      return { kind: "idle" };
  }
}

/** Quiet one-line status text (also the aria-live message). */
export function shadowMessage(s: ShadowState): string {
  switch (s.kind) {
    case "recording":
      return "녹음 중…";
    case "recorded":
      return "다시 들어보기";
    case "playing":
      return "재생 중…";
    case "error":
      return s.reason === "denied"
        ? "마이크 권한이 필요해요"
        : s.reason === "unsupported"
          ? "이 브라우저는 녹음을 지원하지 않아요"
          : "녹음하지 못했어요";
    default:
      return "";
  }
}
