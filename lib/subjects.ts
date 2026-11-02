/**
 * `dueKey` is the lookup key into the per-mode due-count map. Most subjects
 * map 1:1 to a SRS mode, but /sentence and /particle share the same SRS
 * mode ("sentence") and have to be split by their card-id list — those two
 * use composite keys ("sentence_vocab" / "sentence_particle").
 */
export const SUBJECTS: ReadonlyArray<{
  ko: string;
  jp: string;
  base: string;
  dueKey: string;
}> = [
  { ko: "한자", jp: "漢字", base: "/kanji", dueKey: "kanji" },
  { ko: "단어", jp: "単語", base: "/vocab", dueKey: "vocab" },
  { ko: "문장", jp: "文章", base: "/sentence", dueKey: "sentence_vocab" },
  { ko: "조사", jp: "助詞", base: "/particle", dueKey: "sentence_particle" },
  { ko: "동사활용", jp: "活用", base: "/conjugation", dueKey: "conjugation" },
  { ko: "형용사", jp: "形容詞", base: "/adjective", dueKey: "adjective" },
  { ko: "문법", jp: "文法", base: "/grammar", dueKey: "grammar" },
  { ko: "일상표현", jp: "表現", base: "/expressions", dueKey: "expression" },
  { ko: "듣기", jp: "聞き取り", base: "/listening", dueKey: "listening" },
];
