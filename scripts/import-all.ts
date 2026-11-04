/**
 * Import every seed file into the DB, then sync chapters.
 *
 *   bun scripts/import-all.ts            # run it (local DB from .env.local)
 *   JIKARI_DB=remote bun scripts/import-all.ts
 *   bun scripts/import-all.ts --dry-run  # print the plan, touch nothing
 *
 * Each add-* script skips ids that already exist, so re-running only adds
 * what is new. Content fixes to rows already in the DB are A_* migrations
 * (bun run db:migrate), not this.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importPlan } from "./import-plan";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plan = importPlan(readdirSync(path.join(root, "data/seeds")), readdirSync(path.join(root, "data")));
const dryRun = process.argv.includes("--dry-run");

const run = (args: string[]) => {
  console.log(`\n$ bun ${args.join(" ")}`);
  if (dryRun) return;
  const r = spawnSync("bun", args, { cwd: root, stdio: "inherit", env: process.env });
  if (r.status !== 0) {
    console.error(`✗ failed: bun ${args.join(" ")}`);
    process.exit(r.status ?? 1);
  }
};

for (const s of plan) run([s.script, s.file]);
run(["scripts/import-chapters.ts"]);
console.log(dryRun ? `\n(dry-run) ${plan.length} files + chapter sync` : `\n✓ imported ${plan.length} files + chapters`);
