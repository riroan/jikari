/**
 * Which seed files go through which add-* script, in what order.
 *
 * Order matters only for the chapter sync at the end (it matches against
 * what is already in the DB); among the card tables any order works, but
 * a stable one keeps logs comparable between runs. Every add-* script
 * skips ids that already exist, so the whole plan is safe to re-run.
 */
export interface ImportStep {
  script: string;
  file: string;
}

const RULES: { script: string; dir: "seeds" | "data"; match: RegExp }[] = [
  { script: "scripts/add-kanji.ts", dir: "seeds", match: /^kanji-.*\.json$/ },
  { script: "scripts/add-vocab.ts", dir: "seeds", match: /^vocab-.*\.json$/ },
  { script: "scripts/add-sentence.ts", dir: "seeds", match: /^(sentences|particles)-.*\.json$/ },
  { script: "scripts/add-expression.ts", dir: "seeds", match: /^expressions-.*\.json$/ },
  // grammar-seed-sample.json is real data (unit b1 uses its particle-wa-ga).
  { script: "scripts/add-grammar.ts", dir: "data", match: /^grammar-.*\.json$/ },
];

export function importPlan(seedFiles: readonly string[], dataFiles: readonly string[]): ImportStep[] {
  const steps: ImportStep[] = [];
  for (const r of RULES) {
    const names = (r.dir === "seeds" ? seedFiles : dataFiles).filter((f) => r.match.test(f)).sort();
    const prefix = r.dir === "seeds" ? "data/seeds/" : "data/";
    for (const f of names) steps.push({ script: r.script, file: prefix + f });
  }
  return steps;
}
