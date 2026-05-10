import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChapterOverview } from "@/components/ChapterOverview";
import type {
  CardMode,
  ChapterMember,
  KanjiCard,
  VocabCard,
} from "@/lib/types";

afterEach(() => {
  cleanup();
});

const makeVocab = (id: string): VocabCard => ({
  id,
  word: id,
  reading: id,
  meanings: [],
  koreanMeanings: ["테스트"],
  jlptLevel: 5,
});

const makeKanji = (id: string): KanjiCard => ({
  id,
  kanji: id,
  onReadings: [],
  kunReadings: [],
  meanings: [],
  jlptLevel: 5,
  koreanHanja: id,
  koreanSound: [],
  koreanMeaning: "test",
});

const noDue: Record<CardMode, number> = {
  kanji: 0,
  vocab: 0,
  sentence: 0,
  grammar: 0,
  conjugation: 0,
  adjective: 0,
  expression: 0,
};

describe("ChapterOverview", () => {
  it("renders the percent + N/M caption", () => {
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
      { chapterId: "ch1", mode: "vocab", cardId: "v2" },
    ];
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={members.map((m) => ({ member: m, card: makeVocab(m.cardId) }))}
        mastery={{ masteredCount: 1, validMembers: 2, ratio: 0.5 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.getByText("50")).toBeDefined();
    expect(screen.getByText("1 / 2 카드")).toBeDefined();
  });

  it("hides the ABOUT section when intro is null", () => {
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={[]}
        mastery={{ masteredCount: 0, validMembers: 0, ratio: 0 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.queryByText("ABOUT")).toBeNull();
  });

  it("shows the ABOUT section when intro is present", () => {
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: "이 챕터는 음식 관련." }}
        members={[]}
        mastery={{ masteredCount: 0, validMembers: 0, ratio: 0 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.getByText("ABOUT")).toBeDefined();
    expect(screen.getByText("이 챕터는 음식 관련.")).toBeDefined();
  });

  it("renders only modes with members > 0 in the CARDS panel", () => {
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
      { chapterId: "ch1", mode: "kanji", cardId: "k1" },
    ];
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={[
          { member: members[0], card: makeVocab("v1") },
          { member: members[1], card: makeKanji("k1") },
        ]}
        mastery={{ masteredCount: 0, validMembers: 2, ratio: 0 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.getByText("단어 / 単語")).toBeDefined();
    expect(screen.getByText("한자 / 漢字")).toBeDefined();
    // No sentence / grammar members → those rows shouldn't appear.
    expect(screen.queryByText("문장·조사 / 文章·助詞")).toBeNull();
    expect(screen.queryByText("문법 / 文法")).toBeNull();
  });

  it("renders 'live' CTA copy when totalDue > 0", () => {
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
    ];
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={[{ member: members[0], card: makeVocab("v1") }]}
        mastery={{ masteredCount: 0, validMembers: 1, ratio: 0 }}
        mounted={true}
        dueCountsByMode={{ ...noDue, vocab: 3 }}
      />,
    );
    expect(screen.getByText(/복습 3장 시작/)).toBeDefined();
  });

  it("renders calm CTA copy when nothing is due", () => {
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
    ];
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={[{ member: members[0], card: makeVocab("v1") }]}
        mastery={{ masteredCount: 1, validMembers: 1, ratio: 1 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.getByText(/이 챕터 퀴즈 시작/)).toBeDefined();
  });

  it("hides CTA + shows the empty notice when there are no members", () => {
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={[]}
        mastery={{ masteredCount: 0, validMembers: 0, ratio: 0 }}
        mounted={true}
        dueCountsByMode={noDue}
      />,
    );
    expect(screen.queryByText(/이 챕터 퀴즈 시작/)).toBeNull();
    expect(
      screen.getByText(/이 챕터에 사용 가능한 카드가 아직 없습니다/),
    ).toBeDefined();
  });

  it("shows '・N 복습' next to a mode count when due > 0 for it", () => {
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
      { chapterId: "ch1", mode: "vocab", cardId: "v2" },
    ];
    render(
      <ChapterOverview
        chapter={{ id: "ch1", name: "x", intro: null }}
        members={members.map((m) => ({ member: m, card: makeVocab(m.cardId) }))}
        mastery={{ masteredCount: 0, validMembers: 2, ratio: 0 }}
        mounted={true}
        dueCountsByMode={{ ...noDue, vocab: 1 }}
      />,
    );
    expect(screen.getByText(/・1 복습/)).toBeDefined();
  });
});
