import "server-only";
import type { RowDataPacket } from "mysql2";
import { getPool } from "./client";
import type {
  JLPTLevel,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "../types";

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function getAllKanji(): Promise<KanjiCard[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, kanji, on_readings, kun_readings, meanings, jlpt_level, korean_hanja, korean_sound, korean_meaning FROM kanji_cards ORDER BY id"
  );
  return rows.map((r) => ({
    id: r.id as string,
    kanji: r.kanji as string,
    onReadings: parseJson<string[]>(r.on_readings, []),
    kunReadings: parseJson<string[]>(r.kun_readings, []),
    meanings: parseJson<string[]>(r.meanings, []),
    jlptLevel: r.jlpt_level as JLPTLevel,
    koreanHanja: r.korean_hanja as string,
    koreanSound: parseJson<string[]>(r.korean_sound, []),
    koreanMeaning: r.korean_meaning as string,
  }));
}

export async function getAllVocab(): Promise<VocabCard[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, word, reading, meanings, korean_meanings, ruby, jlpt_level FROM vocab_cards ORDER BY id"
  );
  return rows.map((r) => ({
    id: r.id as string,
    word: r.word as string,
    reading: r.reading as string,
    meanings: parseJson<string[]>(r.meanings, []),
    koreanMeanings: parseJson<string[]>(r.korean_meanings, []),
    ruby: (r.ruby as string | null) ?? undefined,
    jlptLevel: r.jlpt_level as JLPTLevel,
  }));
}

export async function getAllSentences(): Promise<SentenceCard[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT id, sentence, sentence_ruby, blank, blank_ruby, distractors, translation, jlpt_level FROM sentence_cards ORDER BY id"
  );
  return rows.map((r) => ({
    id: r.id as string,
    sentence: r.sentence as string,
    sentenceRuby: (r.sentence_ruby as string | null) ?? undefined,
    blank: r.blank as string,
    blankRuby: (r.blank_ruby as string | null) ?? undefined,
    distractors: parseJson<string[]>(r.distractors, []),
    translation: r.translation as string,
    jlptLevel: r.jlpt_level as JLPTLevel,
  }));
}
