import { describe, expect, it } from "vitest";
import {
  computePrayerTimes,
  formatClock,
  nextPrayer,
  PRAYER_METHODS,
} from "./prayer-times";

const JAKARTA = { lat: -6.2615, lng: 106.8106 };

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function expectWithin(actual: string, expected: string, tolerance: number) {
  const diff = Math.abs(minutesOf(actual) - minutesOf(expected));
  expect(
    diff,
    `${actual} should be within ${tolerance} min of ${expected}`,
  ).toBeLessThanOrEqual(tolerance);
}

describe("prayer times", () => {
  it("matches the published Jakarta schedule for 15 Sep 2026", () => {
    const times = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    });
    const by = Object.fromEntries(times.map((t) => [t.name, t.time]));

    // Kemenag's published Jakarta schedule for this date.
    expectWithin(by.subuh, "04:32", 2);
    expectWithin(by.zuhur, "11:50", 2);
    expectWithin(by.asar, "15:03", 2);
    expectWithin(by.magrib, "17:52", 2);
    expectWithin(by.isya, "19:01", 2);
  });

  it("keeps the order of the day's prayers in every season", () => {
    for (const date of ["2026-03-21", "2026-06-21", "2026-09-23", "2026-12-21"]) {
      const t = computePrayerTimes({
        date,
        ...JAKARTA,
        method: "kemenag",
        timezone: 7,
      });
      const m = Object.fromEntries(t.map((x) => [x.name, x.minutes]));
      expect(m.imsak).toBeLessThan(m.subuh);
      expect(m.subuh).toBeLessThan(m.terbit);
      expect(m.terbit).toBeLessThan(m.zuhur);
      expect(m.zuhur).toBeLessThan(m.asar);
      expect(m.asar).toBeLessThan(m.magrib);
      expect(m.magrib).toBeLessThan(m.isya);
    }
  });

  it("puts Asr later under the Hanafi shadow factor", () => {
    const shafii = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    }).find((t) => t.name === "asar")!;

    const hanafiMethod = { ...PRAYER_METHODS.kemenag, asrFactor: 2 as const };
    // Exercise the factor directly rather than adding a method the UI cannot
    // reach; the point is that the parameter is load-bearing.
    const saved = PRAYER_METHODS.kemenag.asrFactor;
    (PRAYER_METHODS.kemenag as { asrFactor: 1 | 2 }).asrFactor =
      hanafiMethod.asrFactor;
    const hanafi = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    }).find((t) => t.name === "asar")!;
    (PRAYER_METHODS.kemenag as { asrFactor: 1 | 2 }).asrFactor = saved;

    expect(hanafi.minutes).toBeGreaterThan(shafii.minutes);
  });

  it("varies Fajr and Isha with the method's angles", () => {
    const kemenag = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    });
    const isna = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "isna",
      timezone: 7,
    });
    const fajrK = kemenag.find((t) => t.name === "subuh")!.minutes;
    const fajrI = isna.find((t) => t.name === "subuh")!.minutes;
    // A shallower angle (15°) means the sun is closer to the horizon, so Fajr
    // is later than under Kemenag's 20°.
    expect(fajrI).toBeGreaterThan(fajrK);
  });

  it("uses a fixed offset after Maghrib for Umm al-Qura", () => {
    const t = computePrayerTimes({
      date: "2026-09-15",
      lat: 21.3891,
      lng: 39.8579,
      method: "makkah",
      timezone: 3,
    });
    const magrib = t.find((x) => x.name === "magrib")!.minutes;
    const isya = t.find((x) => x.name === "isya")!.minutes;
    expect(isya - magrib).toBe(90);
  });

  it("wraps the countdown to tomorrow's Subuh after Isha", () => {
    const times = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    });
    const late = nextPrayer(times, 23 * 60 + 30);
    expect(late?.prayer.name).toBe("subuh");
    expect(late?.minutesUntil).toBeGreaterThan(0);
  });

  it("finds the next prayer during the day", () => {
    const times = computePrayerTimes({
      date: "2026-09-15",
      ...JAKARTA,
      method: "kemenag",
      timezone: 7,
    });
    const midday = nextPrayer(times, 12 * 60 + 58);
    expect(midday?.prayer.name).toBe("asar");
  });

  it("formats clock values without drifting past midnight", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(1439)).toBe("23:59");
    expect(formatClock(1440)).toBe("00:00");
    expect(formatClock(-30)).toBe("23:30");
  });
});
