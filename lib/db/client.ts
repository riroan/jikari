import "server-only";
import mysql from "mysql2/promise";

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

declare global {
  // eslint-disable-next-line no-var
  var __jikariPool: mysql.Pool | undefined;
}

export function getPool(): mysql.Pool {
  if (!globalThis.__jikariPool) {
    globalThis.__jikariPool = mysql.createPool({
      host: envOrThrow("DB_HOST"),
      port: Number(envOrThrow("DB_PORT")),
      user: envOrThrow("DB_USER"),
      password: envOrThrow("DB_PASSWORD"),
      database: envOrThrow("DB_NAME"),
      waitForConnections: true,
      connectionLimit: 5,
      namedPlaceholders: true,
      charset: "utf8mb4",
    });
  }
  return globalThis.__jikariPool;
}
