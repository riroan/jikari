import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ChapterMastery } from "@/components/ChapterMastery";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import type {
  Chapter,
  ChapterMember,
  KanjiCard,
  VocabCard,
} from "@/lib/types";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // Reset both stores to a clean baseline before each test.
  useStore.setState({
    learningStates: {},
    heatmap: {},
    lastActiveAt: 0,
    currentStreak: 0,
    quizStats: {},
  });
  useCardsStore.setState({
    ready: true,
    chapters: [],
    chapterMembers: [],
    membersByChapter: new Map(),
    kanji: [],
    vocab: [],
    sentences: [],
    grammar: [],
    kanjiIds: [],
    vocabIds: [],
    sentenceIds: [],
    particleIds: [],
    grammarPatternIds: [],
    grammarParticleContrastIds: [],
    kanjiById: new Map(),
    vocabById: new Map(),
    sentenceById: new Map(),
    grammarById: new Map(),
    vocabByWord: new Map(),
  });
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

const makeVocab = (id: string): VocabCard => ({
  id,
  word: id,
  reading: id,
  meanings: [],
  koreanMeanings: ["테스트"],
  jlptLevel: 5,
});

describe("ChapterMastery — empty state", () => {
  it("renders nothing when chapters list is empty", () => {
    const { container } = render(<ChapterMastery />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ChapterMastery — populated state", () => {
  it("renders one row per chapter with name + bar + caption", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "음식·식사", intro: null, sortOrder: 10 },
      { id: "ch2", name: "교통·이동", intro: null, sortOrder: 20 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "ご飯" },
      { chapterId: "ch1", mode: "vocab", cardId: "肉" },
      { chapterId: "ch2", mode: "vocab", cardId: "車" },
    ];
    const membersByChapter = new Map<string, ChapterMember[]>([
      ["ch1", members.slice(0, 2)],
      ["ch2", members.slice(2)],
    ]);
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter,
      vocab: [makeVocab("ご飯"), makeVocab("肉"), makeVocab("車")],
      vocabById: new Map([
        ["ご飯", makeVocab("ご飯")],
        ["肉", makeVocab("肉")],
        ["車", makeVocab("車")],
      ]),
    });

    render(<ChapterMastery />);

    expect(screen.getByText("음식·식사")).toBeDefined();
    expect(screen.getByText("교통·이동")).toBeDefined();
    expect(screen.getByText("UNITS")).toBeDefined();
  });

  it("displays correct percent and member count caption (mounted=true, default)", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "테스트", intro: null, sortOrder: 10 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
      { chapterId: "ch1", mode: "vocab", cardId: "v2" },
      { chapterId: "ch1", mode: "kanji", cardId: "k1" },
      { chapterId: "ch1", mode: "kanji", cardId: "k2" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ch1", members]]),
      vocabById: new Map([
        ["v1", makeVocab("v1")],
        ["v2", makeVocab("v2")],
      ]),
      kanjiById: new Map([
        ["k1", makeKanji("k1")],
        ["k2", makeKanji("k2")],
      ]),
    });
    // Mark v1 + k1 as mastered (box ≥ 4); v2 + k2 default to box 1.
    useStore.setState({
      learningStates: {
        "vocab:v1": {
          cardKey: "vocab:v1",
          mode: "vocab",
          cardId: "v1",
          box: 5,
          nextDue: 0,
          correctStreak: 0,
          lastReviewed: 1,
        },
        "kanji:k1": {
          cardKey: "kanji:k1",
          mode: "kanji",
          cardId: "k1",
          box: 4,
          nextDue: 0,
          correctStreak: 0,
          lastReviewed: 1,
        },
      },
    });

    render(<ChapterMastery />);
    // 2/4 = 50% mastered
    expect(screen.getByText("50% · 4")).toBeDefined();
  });

  it("ARIA label on link exposes mastery percent and counts to screen readers", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "x", intro: null, sortOrder: 10 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "a" },
      { chapterId: "ch1", mode: "vocab", cardId: "b" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ch1", members]]),
      vocabById: new Map([
        ["a", makeVocab("a")],
        ["b", makeVocab("b")],
      ]),
    });

    render(<ChapterMastery />);
    const link = screen.getByLabelText(/x — 마스터리 0퍼센트, 0 \/ 2 카드/);
    expect(link.getAttribute("href")).toBe("/chapters/ch1");
  });

  it("shows due indicator when at least one member's review is due", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "due-test", intro: null, sortOrder: 10 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
      { chapterId: "ch1", mode: "vocab", cardId: "v2" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ch1", members]]),
      vocabById: new Map([
        ["v1", makeVocab("v1")],
        ["v2", makeVocab("v2")],
      ]),
    });
    // v1 is due (nextDue ≤ now); v2 is not due yet (far future).
    useStore.setState({
      learningStates: {
        "vocab:v1": {
          cardKey: "vocab:v1",
          mode: "vocab",
          cardId: "v1",
          box: 2,
          nextDue: 1,
          correctStreak: 0,
          lastReviewed: 1,
        },
        "vocab:v2": {
          cardKey: "vocab:v2",
          mode: "vocab",
          cardId: "v2",
          box: 2,
          nextDue: Number.MAX_SAFE_INTEGER,
          correctStreak: 0,
          lastReviewed: 1,
        },
      },
    });

    render(<ChapterMastery />);
    // The "・1" chip carries the single due card (only v1 is past nextDue).
    expect(screen.getByText("・1")).toBeDefined();
  });

  it("sort='mastery-asc' lists weakest chapter first", () => {
    const chapters: Chapter[] = [
      { id: "high", name: "고-마스터리", intro: null, sortOrder: 1 },
      { id: "low", name: "저-마스터리", intro: null, sortOrder: 2 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "high", mode: "vocab", cardId: "h" },
      { chapterId: "low", mode: "vocab", cardId: "l" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([
        ["high", members.slice(0, 1)],
        ["low", members.slice(1)],
      ]),
      vocabById: new Map([
        ["h", makeVocab("h")],
        ["l", makeVocab("l")],
      ]),
    });
    // high mastered (box 5), low untouched (box 1).
    useStore.setState({
      learningStates: {
        "vocab:h": {
          cardKey: "vocab:h",
          mode: "vocab",
          cardId: "h",
          box: 5,
          nextDue: 0,
          correctStreak: 1,
          lastReviewed: 1,
        },
      },
    });

    render(<ChapterMastery sort="mastery-asc" />);
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe("/chapters/low");
    expect(links[1].getAttribute("href")).toBe("/chapters/high");
  });

  it("sort='due-desc' lists biggest review backlog first", () => {
    const chapters: Chapter[] = [
      { id: "small", name: "작은", intro: null, sortOrder: 1 },
      { id: "big", name: "큰", intro: null, sortOrder: 2 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "small", mode: "vocab", cardId: "s1" },
      { chapterId: "big", mode: "vocab", cardId: "b1" },
      { chapterId: "big", mode: "vocab", cardId: "b2" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([
        ["small", members.slice(0, 1)],
        ["big", members.slice(1)],
      ]),
      vocabById: new Map([
        ["s1", makeVocab("s1")],
        ["b1", makeVocab("b1")],
        ["b2", makeVocab("b2")],
      ]),
    });
    // 1 due in small, 2 due in big.
    useStore.setState({
      learningStates: {
        "vocab:s1": {
          cardKey: "vocab:s1", mode: "vocab", cardId: "s1",
          box: 1, nextDue: 1, correctStreak: 0, lastReviewed: 1,
        },
        "vocab:b1": {
          cardKey: "vocab:b1", mode: "vocab", cardId: "b1",
          box: 1, nextDue: 1, correctStreak: 0, lastReviewed: 1,
        },
        "vocab:b2": {
          cardKey: "vocab:b2", mode: "vocab", cardId: "b2",
          box: 1, nextDue: 1, correctStreak: 0, lastReviewed: 1,
        },
      },
    });

    render(<ChapterMastery sort="due-desc" />);
    const links = screen.getAllByRole("link");
    expect(links[0].getAttribute("href")).toBe("/chapters/big");
    expect(links[1].getAttribute("href")).toBe("/chapters/small");
  });

  it("hides due indicator when nothing is due", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "no-due", intro: null, sortOrder: 10 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ch1", members]]),
      vocabById: new Map([["v1", makeVocab("v1")]]),
    });
    // Mastered + not yet due → should NOT show the due chip.
    useStore.setState({
      learningStates: {
        "vocab:v1": {
          cardKey: "vocab:v1",
          mode: "vocab",
          cardId: "v1",
          box: 5,
          nextDue: Number.MAX_SAFE_INTEGER,
          correctStreak: 0,
          lastReviewed: 1,
        },
      },
    });
    render(<ChapterMastery />);
    expect(screen.queryByText(/^・\d+/)).toBeNull();
  });

  it("shows em dash when chapter has 0 valid members (all stale)", () => {
    const chapters: Chapter[] = [
      { id: "ghost-ch", name: "유령 챕터", intro: null, sortOrder: 99 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ghost-ch", mode: "vocab", cardId: "deleted-card" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ghost-ch", members]]),
      // No cards in vocabById → member is stale.
    });
    render(<ChapterMastery />);
    expect(screen.getByText("—")).toBeDefined();
  });
});

describe("ChapterMastery — SSR/hydration guard", () => {
  it("mounted=false renders structure but with 0% values (no hydration mismatch)", () => {
    const chapters: Chapter[] = [
      { id: "ch1", name: "x", intro: null, sortOrder: 10 },
    ];
    const members: ChapterMember[] = [
      { chapterId: "ch1", mode: "vocab", cardId: "v1" },
    ];
    useCardsStore.setState({
      chapters,
      chapterMembers: members,
      membersByChapter: new Map([["ch1", members]]),
      vocabById: new Map([["v1", makeVocab("v1")]]),
    });
    useStore.setState({
      learningStates: {
        "vocab:v1": {
          cardKey: "vocab:v1",
          mode: "vocab",
          cardId: "v1",
          box: 5,
          nextDue: 0,
          correctStreak: 0,
          lastReviewed: 1,
        },
      },
    });

    render(<ChapterMastery mounted={false} />);
    // Even though v1 is mastered, mounted=false suppresses to 0% on first paint.
    expect(screen.getByText("0% · 1")).toBeDefined();
  });
});
