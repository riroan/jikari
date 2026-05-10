import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import {
  FuriganaProvider,
  RubyText,
  Furigana,
  stripRuby,
} from "@/components/Furigana";

afterEach(() => {
  cleanup();
});

describe("RubyText", () => {
  it("renders plain text without ruby markup as a single span", () => {
    const { container } = render(<RubyText text="안녕" />);
    expect(container.querySelector("ruby")).toBeNull();
    expect(screen.getByText("안녕")).toBeDefined();
  });

  it("renders ruby markup as <ruby><rt>", () => {
    const { container } = render(<RubyText text="{漢字|かんじ}" />);
    const ruby = container.querySelector("ruby");
    expect(ruby).not.toBeNull();
    expect(ruby?.textContent).toContain("漢字");
    const rt = container.querySelector("rt");
    expect(rt?.textContent).toBe("かんじ");
  });

  it("hides furigana when context says don't show", () => {
    const { container } = render(
      <FuriganaProvider show={false}>
        <RubyText text="{漢字|かんじ}" />
      </FuriganaProvider>,
    );
    expect(container.querySelector("ruby")).toBeNull();
    expect(container.querySelector("rt")).toBeNull();
    expect(screen.getByText("漢字")).toBeDefined();
  });

  it("forceShow overrides a hidden-context", () => {
    const { container } = render(
      <FuriganaProvider show={false}>
        <RubyText text="{漢字|かんじ}" forceShow />
      </FuriganaProvider>,
    );
    expect(container.querySelector("rt")?.textContent).toBe("かんじ");
  });

  it("renders highlight [[…]] as <mark.jp-highlight>", () => {
    const { container } = render(<RubyText text="[[なければ]]ならない" />);
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    expect(mark?.className).toContain("jp-highlight");
    expect(mark?.textContent).toBe("なければ");
  });

  it("nests ruby inside highlight", () => {
    const { container } = render(
      <RubyText text="[[{食|た}べる]]" />,
    );
    const mark = container.querySelector("mark");
    expect(mark).not.toBeNull();
    const rt = mark?.querySelector("rt");
    expect(rt?.textContent).toBe("た");
  });
});

describe("Furigana — single-pair wrapper", () => {
  it("renders ruby when reading is provided + context allows", () => {
    const { container } = render(<Furigana kanji="本" reading="ほん" />);
    expect(container.querySelector("ruby")).not.toBeNull();
    expect(container.querySelector("rt")?.textContent).toBe("ほん");
  });

  it("renders just the kanji when reading is omitted", () => {
    const { container } = render(<Furigana kanji="本" />);
    expect(container.querySelector("ruby")).toBeNull();
    expect(screen.getByText("本")).toBeDefined();
  });

  it("respects FuriganaProvider context", () => {
    const { container } = render(
      <FuriganaProvider show={false}>
        <Furigana kanji="本" reading="ほん" />
      </FuriganaProvider>,
    );
    expect(container.querySelector("ruby")).toBeNull();
  });
});

describe("stripRuby", () => {
  it("removes furigana, keeping the base text", () => {
    expect(stripRuby("{漢字|かんじ}を読む")).toBe("漢字を読む");
  });

  it("returns plain text unchanged", () => {
    expect(stripRuby("ひらがな")).toBe("ひらがな");
  });

  it("strips highlight wrappers but keeps the inner text", () => {
    expect(stripRuby("[[なければ]]ならない")).toBe("なければならない");
  });
});
