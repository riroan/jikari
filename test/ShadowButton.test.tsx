import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { ShadowButton } from "@/components/ShadowButton";

class FakeRecorder {
  static last: FakeRecorder;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: { size: number } }) => void) | null = null;
  onstop: (() => void) | null = null;
  static isTypeSupported = () => true;
  constructor() {
    FakeRecorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

const makeStream = () => {
  const track = { stop: vi.fn() };
  return { track, stream: { getTracks: () => [track] } as unknown as MediaStream };
};

let getUserMedia: ReturnType<typeof vi.fn>;
let n = 0;

beforeEach(() => {
  n = 0;
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  URL.createObjectURL = vi.fn(() => `blob:${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mic = () => screen.getByRole("button", { name: "따라 말하기" });
const record = async () => {
  await act(async () => fireEvent.click(mic()));
  FakeRecorder.last.ondataavailable?.({ data: { size: 3 } });
  await act(async () => fireEvent.click(mic())); // stop
};

describe("ShadowButton", () => {
  it("stops the tracks if unmounted while the permission prompt is pending", async () => {
    const { track, stream } = makeStream();
    let resolve!: (s: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<ShadowButton />);
    fireEvent.click(mic());
    unmount();
    await act(async () => resolve(stream));
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("double-tap during start opens only one stream", async () => {
    const { stream } = makeStream();
    let resolve!: (s: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ShadowButton />);
    fireEvent.click(mic());
    fireEvent.click(mic());
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    await act(async () => resolve(stream));
  });

  it("shows the Korean denied message and can retry", async () => {
    getUserMedia.mockRejectedValueOnce(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    render(<ShadowButton />);
    await act(async () => fireEvent.click(mic()));
    expect(screen.getByRole("status").textContent).toBe("마이크 권한이 필요해요");
    getUserMedia.mockResolvedValueOnce(makeStream().stream);
    await act(async () => fireEvent.click(mic()));
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status").textContent).toBe("녹음 중…");
  });

  it("stop releases the tracks and keeps a take; re-record and unmount revoke the old URL", async () => {
    const a = makeStream();
    getUserMedia.mockResolvedValueOnce(a.stream);
    const { unmount } = render(<ShadowButton />);
    await record();
    expect(a.track.stop).toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("녹음됨");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    getUserMedia.mockResolvedValueOnce(makeStream().stream);
    await record();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:2");
  });
});
