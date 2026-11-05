import { describe, expect, test } from "vitest";
import { isJoyo, joyoReadings, nonJoyoChars } from "@/lib/joyo";
import joyo from "../data/joyo.json";

describe("常用漢字表 data", () => {
  test("2,136 characters and 4,388 readings (the table's official counts)", () => {
    const t = joyo as Record<string, { on: string[]; kun: string[] }>;
    expect(Object.keys(t)).toHaveLength(2136);
    const readings = Object.values(t).reduce((n, e) => n + e.on.length + e.kun.length, 0);
    expect(readings).toBe(4388);
  });

  test("readings come back in seed form: hiragana, okurigana joined, affix marks dropped", () => {
    const r = joyoReadings("暗")!;
    expect([...r.on]).toEqual(["あん"]);
    expect([...r.kun]).toEqual(["くらい"]);
    expect(joyoReadings("一")!.kun.has("ひとつ")).toBe(true);
    expect(joyoReadings("圧")!.kun.size).toBe(0);
  });

  test("isJoyo / nonJoyoChars", () => {
    expect(isJoyo("食")).toBe(true);
    expect(isJoyo("綺")).toBe(false);
    // 麗는 상용한자(レイ·うるわしい), 綺·嘘는 아니다. 々는 반복 부호라 세지 않는다.
    expect(nonJoyoChars("綺麗な部屋々に嘘")).toEqual(["綺", "嘘"]);
  });
});
