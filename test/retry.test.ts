import { expect, test } from "vitest";
import { backoffMs } from "@/lib/retry";

test("backoff grows then caps at 30s", () => {
  expect([1, 2, 3, 4, 9].map(backoffMs)).toEqual([2000, 5000, 15000, 30000, 30000]);
});
