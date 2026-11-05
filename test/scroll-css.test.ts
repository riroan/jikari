import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

/** 규칙 블록 본문. 셀렉터가 정확히 일치하는 첫 블록. */
function block(selector: string): string {
  const m = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  return m?.[1] ?? "";
}

describe("page scroll CSS", () => {
  // html과 body가 둘 다 overflow-x:hidden이면 body도 스크롤 컨테이너가 된다.
  // 거기에 overscroll-behavior:none이 있으면 데스크톱 마우스 휠이 뷰포트로
  // 넘어가지 않아 페이지가 스크롤되지 않는다 (모바일 터치는 멀쩡해서 놓치기 쉽다).
  test("body에는 overscroll-behavior를 두지 않는다 (html에만)", () => {
    expect(block("html, body")).not.toMatch(/overscroll-behavior/);
    expect(block("body")).not.toMatch(/overscroll-behavior/);
    expect(block("html")).toMatch(/overscroll-behavior-y:\s*none/);
  });
});
