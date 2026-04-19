import mysql from "mysql2/promise";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadJikariEnv } from "./_env";

loadJikariEnv();

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
  console.error("Missing DB env vars (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).");
  process.exit(1);
}

async function main() {
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
  });
  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename VARCHAR(128) PRIMARY KEY,
      applied_at BIGINT NOT NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);

  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    "SELECT filename FROM _migrations"
  );
  const applied = new Set(rows.map((r) => r.filename as string));

  // DDL files use numeric prefixes (0001_, 0002_, …). DML-only (content/data)
  // files use the `A_` prefix so they sort after all DDL and never collide on
  // number. ASCII '0' < 'A', so default alphabetical sort runs DDL first.
  const dir = path.join(process.cwd(), "lib/db/migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let appliedCount = 0;
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`  skip  ${f}`);
      continue;
    }
    const sql = await readFile(path.join(dir, f), "utf-8");
    console.log(`  apply ${f}`);
    await conn.query(sql);
    await conn.query(
      "INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)",
      [f, Date.now()]
    );
    appliedCount++;
  }

  await conn.end();
  console.log(`✓ migrations complete (applied ${appliedCount})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
