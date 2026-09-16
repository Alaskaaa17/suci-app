import { describe, expect, it } from "vitest";
import { generateShareToken } from "./crypto";

/**
 * The token is the only thing standing between a guessed URL and someone's
 * cycle status, so its distribution is worth asserting rather than assuming.
 */
describe("share token", () => {
  it("has the shape the share screen renders", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateShareToken()).toMatch(
        /^[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}-[a-hj-km-np-z2-9]{4}$/,
      );
    }
  });

  it("omits look-alike characters", () => {
    const joined = Array.from({ length: 200 }, generateShareToken).join("");
    for (const confusable of ["i", "l", "o", "0", "1"]) {
      expect(joined).not.toContain(confusable);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 500 }, generateShareToken));
    expect(seen.size).toBe(500);
  });

  it("draws uniformly, with no modulo bias toward early letters", () => {
    const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
    const counts = new Map(ALPHABET.split("").map((c) => [c, 0]));

    const samples = 4000;
    for (let i = 0; i < samples; i++) {
      for (const c of generateShareToken().replace(/-/g, "")) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }

    const total = samples * 12;
    const expected = total / ALPHABET.length;
    // `byte % 31` would push the first eight letters ~3% high and is caught
    // well inside this band; genuine sampling noise at this size is ~1%.
    for (const [char, count] of counts) {
      const drift = Math.abs(count - expected) / expected;
      expect(drift, `${char} drifted ${(drift * 100).toFixed(1)}%`).toBeLessThan(
        0.12,
      );
    }
  });
});
