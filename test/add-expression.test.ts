import { describe, expect, test } from "vitest";
import { validate } from "../scripts/add-expression";

const base = {
  id: "e001",
  situation_ko: "퇴근할 때 동료에게",
  expression_jp: "お疲れ様でした",
  register: "polite" as const,
  translation_ko: "수고하셨습니다",
};

describe("add-expression validate()", () => {
  test("valid card with all required fields passes", () => {
    expect(validate(base, 0)).toEqual(base);
  });

  test("valid card with optional ruby + note_ko passes", () => {
    const c = {
      ...base,
      ruby: "{お疲|つか}れ{様|さま}でした",
      note_ko: "연장자·상사에게. 동료끼리는 お疲れ様로 줄여도 됨",
    };
    expect(validate(c, 1)).toEqual(c);
  });

  test("all 3 register values accepted", () => {
    for (const register of ["casual", "polite", "humble"] as const) {
      expect(() => validate({ ...base, register }, 0)).not.toThrow();
    }
  });

  test("invalid register throws with index + hint", () => {
    expect(() => validate({ ...base, register: "formal" }, 3)).toThrow(
      /#3.*register/,
    );
  });

  test("missing id throws", () => {
    const { id, ...noId } = base;
    void id;
    expect(() => validate(noId, 0)).toThrow(/id/);
  });

  test("empty required string throws", () => {
    expect(() => validate({ ...base, situation_ko: "" }, 0)).toThrow(
      /situation_ko/,
    );
    expect(() => validate({ ...base, expression_jp: "" }, 0)).toThrow(
      /expression_jp/,
    );
    expect(() => validate({ ...base, translation_ko: "" }, 0)).toThrow(
      /translation_ko/,
    );
  });

  test("non-string ruby throws", () => {
    expect(() => validate({ ...base, ruby: 123 }, 0)).toThrow(/ruby/);
  });

  test("non-string note_ko throws", () => {
    expect(() => validate({ ...base, note_ko: null }, 0)).toThrow(/note_ko/);
  });

  test("ruby / note_ko explicitly undefined is OK (= omitted)", () => {
    const c = { ...base, ruby: undefined, note_ko: undefined };
    expect(validate(c, 0).ruby).toBeUndefined();
    expect(validate(c, 0).note_ko).toBeUndefined();
  });

  test("non-object throws", () => {
    expect(() => validate(null, 5)).toThrow(/#5.*not an object/);
    expect(() => validate("not an object", 5)).toThrow(/not an object/);
  });

  test("error message includes row index for debugging", () => {
    try {
      validate({ ...base, register: "nope" }, 42);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("#42");
    }
  });
});
