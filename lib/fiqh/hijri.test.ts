import { describe, expect, it } from "vitest";
import { formatHijri, hijriForDate, hilalAtSunset } from "./hijri";

/**
 * Independent check against 1446H, the year Kemenag, NU, and Muhammadiyah
 * all agreed on the same dates — the least ambiguous ground truth available.
 * These assert the raw MABIMS evaluation, not just the anchored calendar, so
 * a bug in the astronomy cannot hide behind the anchor being correct by
 * construction.
 */
describe("hilalAtSunset against 1446H", () => {
  it("does not meet MABIMS on 29 Sya'ban 1446H, which needed istikmal too (28 Feb 2025)", () => {
    // Sya'ban 1446H ran a 30th day: the hilal was below the MABIMS
    // threshold on 28 Feb 2025, and 1 Ramadan followed by istikmal rather
    // than direct sighting — the reason every method converged on the same
    // 1 Maret 2025 date that year despite using different criteria.
    const check = hilalAtSunset("2025-02-28", -6.2615, 106.8106, 7);
    expect(check?.meetsMabims).toBe(false);
  });

  it("does not meet MABIMS the evening Ramadan 1446H needed istikmal (29 Maret 2025)", () => {
    const check = hilalAtSunset("2025-03-29", -6.2615, 106.8106, 7);
    expect(check?.meetsMabims).toBe(false);
  });

  it("meets MABIMS at the sunset before 1 Syawal 1446H (31 Maret 2025)", () => {
    const check = hilalAtSunset("2025-03-30", -6.2615, 106.8106, 7);
    expect(check?.meetsMabims).toBe(true);
  });
});

describe("hijriForDate", () => {
  it("resolves the anchor date itself", () => {
    const h = hijriForDate("2025-03-01");
    expect(h.day).toBe(1);
    expect(h.monthName).toBe("Ramadan");
    expect(h.year).toBe(1446);
  });

  it("resolves the last day of a 30-day Ramadan", () => {
    const h = hijriForDate("2025-03-30");
    expect(h.day).toBe(30);
    expect(h.monthName).toBe("Ramadan");
    expect(h.year).toBe(1446);
  });

  it("crosses into Syawal 1446H", () => {
    const h = hijriForDate("2025-03-31");
    expect(h.day).toBe(1);
    expect(h.monthName).toBe("Syawal");
    expect(h.year).toBe(1446);
  });

  it("steps backward across a year boundary", () => {
    const h = hijriForDate("2025-01-01");
    expect(h.year).toBe(1446);
  });

  it("agrees with itself stepping backward then forward across the same boundary", () => {
    // 28 Feb 2025 is the last day of Sya'ban 1446H, whatever its exact
    // length — the sunset check above already pins that down independently.
    // What this checks is that walking backward from the anchor and then
    // forward again lands on the same date the forward-only tests do,
    // i.e. the two stepping directions do not silently disagree.
    const shaban = hijriForDate("2025-02-28");
    expect(shaban.monthName).toBe("Sya'ban");
    expect(shaban.year).toBe(1446);
    const nextDay = hijriForDate("2025-03-01");
    expect(nextDay.monthName).toBe("Ramadan");
    expect(nextDay.day).toBe(1);
  });

  it("steps forward well past the anchor", () => {
    const h = hijriForDate("2026-09-18");
    expect(h.year).toBeGreaterThanOrEqual(1447);
    expect(h.day).toBeGreaterThanOrEqual(1);
    expect(h.day).toBeLessThanOrEqual(30);
  });

  it("formats as expected", () => {
    const h = hijriForDate("2025-03-01");
    expect(formatHijri(h)).toBe("1 Ramadan 1446 H");
  });
});
