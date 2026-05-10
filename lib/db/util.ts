import "server-only";

/**
 * MySQL JSON columns come back as already-parsed objects in newer drivers and
 * as strings on older ones — be defensive at the read site instead of
 * assuming. Strings that fail to parse return the fallback (matches the
 * "skip the bad row, log and continue" pattern used across lib/db).
 */
export function parseJson<T>(value: unknown, fallback: T): T {
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
