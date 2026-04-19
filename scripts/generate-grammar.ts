/**
 * LLM-based grammar card generator.
 *
 * Status: SKELETON. Needs API key to actually call a model. The Zod
 * validation + dry-run flow is complete and testable today.
 *
 * Usage (post key):
 *   bun scripts/generate-grammar.ts --level N4 --count 30 --type pattern \
 *     --output data/grammar-n4-patterns.json
 *
 * Flow (design doc + eng review 2026-04-19 #5):
 *   1. Call LLM with PROMPT_PATTERN or PROMPT_PARTICLE for N items
 *   2. Parse JSON response, Zod-validate each card
 *   3. Cross-check pass: 2nd LLM call ("is the koreanStructure correct?")
 *   4. Consistency pass: generate same item twice, compare koreanStructure
 *   5. Write validated cards to --output
 *   6. User imports via: bun scripts/add-grammar.ts <output>
 *
 * Dry-run today: pass --dry-run --input <existing.json> to just validate
 * an existing JSON file against the Zod schema without calling an LLM.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseGrammarCardArray } from "../lib/grammar-schema";

interface Args {
  level?: "N5" | "N4";
  count?: number;
  type?: "pattern" | "particle";
  output?: string;
  input?: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--level") args.level = argv[++i] as Args["level"];
    else if (a === "--count") args.count = Number(argv[++i]);
    else if (a === "--type") args.type = argv[++i] as Args["type"];
    else if (a === "--output") args.output = argv[++i];
    else if (a === "--input") args.input = argv[++i];
  }
  return args;
}

function pickProvider(): "anthropic" | "openai" | "none" {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

const PROMPT_PATTERN = `You are generating JLPT Japanese grammar pattern cards for a Korean
native speaker learning Japanese. For each pattern, emit JSON matching
this schema (strict, no extras):

{
  "id": "pattern-<kebab-case-romanization>",
  "type": "pattern",
  "jlptLevel": <5|4>,
  "pattern": "〜pattern",
  "koreanStructure": "direct Korean structural mapping (NOT English)",
  "meaningKo": "one-line Korean meaning",
  "examples": [ { "jp": "...[[fragment]]...", "ko": "..." } ],  // 3 examples
  "quizzes": [ { "sentence": "...＿＿＿...", "correct": "...", "distractors": [3 items], "translation": "..." } ]  // 3 quizzes
}

Rules:
- koreanStructure must be in Korean, not English. Direct structural mapping
  leveraging SOV + particle parallels. No English gloss.
- Examples may use {kanji|kana} ruby markup and [[...]] highlight markup.
  Highlight the pattern fragment in each example.
- Quizzes use ＿＿＿ as the blank. All distractors must be semantically
  distinct (grammatically plausible but wrong in context).
- Use only 常用漢字 (joyo). Fall back to kana if the kanji is outside.
`;

const PROMPT_PARTICLE = `You are generating Japanese particle-contrast cards for a Korean
native speaker. Each card compares TWO particles. Emit JSON matching:

{
  "id": "particle-<p1>-<p2>",
  "type": "particle_contrast",
  "jlptLevel": <5|4>,
  "particles": ["<p1>", "<p2>"],
  "rule": "one-line Korean rule distinguishing them",
  "examples": [  // exactly 4 — 2 per particle
    { "particle": "<p1>", "jp": "...", "ko": "..." },
    ...
  ],
  "quizzes": [  // 3 quizzes
    { "sentence": "...＿＿＿...", "correct": "<p1-or-p2>", "distractors": [3 items from OTHER pairs], "translation": "..." }
  ]
}

Rules:
- Per eng review 2026-04-19 #7: distractors are 4-choice and should
  include particles from OTHER pairs (に, で, を, etc.) to avoid
  2-choice coin-flip memorization.
- "correct" must be one of the two listed particles.
- 常用漢字 범위 준수. 영어 설명 금지 — 한국어만.
`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const provider = pickProvider();

  if (args.dryRun && args.input) {
    const raw = await readFile(path.resolve(args.input), "utf-8");
    const parsed = JSON.parse(raw);
    const cards = parseGrammarCardArray(parsed);
    console.log(`✓ ${args.input}: ${cards.length} cards validated`);
    for (const c of cards) {
      console.log(`  • ${c.id} [${c.type}] N${c.jlptLevel}`);
    }
    return;
  }

  if (provider === "none") {
    console.error(
      "No LLM provider credentials in env. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.",
    );
    console.error(
      "To validate an existing JSON file without calling an LLM: --dry-run --input <file>",
    );
    console.error("\nPrompts the generator would use:");
    console.error("\n=== PROMPT_PATTERN ===");
    console.error(PROMPT_PATTERN);
    console.error("\n=== PROMPT_PARTICLE ===");
    console.error(PROMPT_PARTICLE);
    process.exit(1);
  }

  console.error(
    `provider=${provider}, but the actual LLM call is not wired yet.`,
  );
  console.error(
    "When you're ready, fill in the call site here using the prompts above,",
  );
  console.error(
    "parse the JSON reply with parseGrammarCardArray, run cross-check + consistency",
  );
  console.error(
    "passes, then write to --output. See design doc for the 3-step verification gate.",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
