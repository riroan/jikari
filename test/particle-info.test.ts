import { describe, it, expect } from "vitest";
import { PARTICLE_INFO } from "@/lib/particle-info";

describe("PARTICLE_INFO — schema sanity", () => {
  it("every entry has non-empty label, gloss, note", () => {
    for (const [particle, info] of Object.entries(PARTICLE_INFO)) {
      expect(info.label, `${particle} missing label`).toBeTruthy();
      expect(info.gloss, `${particle} missing gloss`).toBeTruthy();
      expect(info.note, `${particle} missing note`).toBeTruthy();
    }
  });

  it("covers the core JLPT N5-N4 particles tested by /particle mode", () => {
    // These are the particles that the /particle quiz blanks out, plus the
    // sentence-final emphatics; if any go missing the study sheet drops
    // Korean-facing context.
    const required = [
      "は", "が", "を", "に", "で", "へ", "と", "から", "まで",
      "の", "も", "や", "か", "ね", "よ",
    ];
    for (const p of required) {
      expect(PARTICLE_INFO[p], `missing entry for ${p}`).toBeDefined();
    }
  });

  it("Korean glosses use ~ as the binding placeholder (consistency)", () => {
    for (const [particle, info] of Object.entries(PARTICLE_INFO)) {
      expect(
        info.gloss.startsWith("~"),
        `${particle} gloss "${info.gloss}" should start with ~`,
      ).toBe(true);
    }
  });
});
