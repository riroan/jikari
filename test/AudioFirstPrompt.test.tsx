import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioFirstPrompt, blankedSpeech } from "@/components/AudioFirstPrompt";
import * as srs from "@/lib/srs";

describe("blankedSpeech", () => {
  it("replaces the blank with a pause, never the answer", () => {
    expect(blankedSpeech("私は＿＿＿を食べます。")).toBe("私は、を食べます。");
  });
  it("collapses doubled pauses and drops a leading one", () => {
    expect(blankedSpeech("駅＿＿＿、行く。")).toBe("駅、行く。");
    expect(blankedSpeech("＿＿＿はどこですか。")).toBe("はどこですか。");
  });
});

describe("AudioFirstPrompt hesitation timer", () => {
  it("restarts the timer once, on first listen or reveal", () => {
    const spy = vi.spyOn(srs, "markShown");
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ lang: "ja-JP" }],
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
        pending: false,
      },
    });
    render(<AudioFirstPrompt speakText="x"><p>文</p></AudioFirstPrompt>);
    fireEvent.click(screen.getByLabelText("문장 듣기"));
    fireEvent.click(screen.getByLabelText("천천히 듣기"));
    fireEvent.click(screen.getByText("문장 보기"));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
