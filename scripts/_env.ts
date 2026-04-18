import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Load DB env vars. Defaults to `.env.local` (local MySQL).
 * Set `JIKARI_DB=remote` to override from `.env.remote.local`.
 *
 * Prints which target is being used, so scripts never silently write
 * to the wrong database.
 */
export function loadJikariEnv(): void {
  loadEnvConfig(process.cwd());

  const target = process.env.JIKARI_DB === "remote" ? "remote" : "local";

  if (target === "remote") {
    const file = path.resolve(".env.remote.local");
    if (!existsSync(file)) {
      throw new Error(
        `JIKARI_DB=remote but ${file} not found. Create it with remote DB creds.`
      );
    }
    for (const line of readFileSync(file, "utf-8").split("\n")) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
  }

  console.log(
    `→ DB target: ${target}  (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`
  );
}
