import { describe, expect, it } from "vitest";
import { addDays, eachDay, type IsoDate } from "@/lib/date";
import { analyzeCycle, rulingFor } from "./cycle";
import { buildVerdict } from "./verdict";
import { Classification, type DayEntry, type Profile } from "./types";
import type { MadhhabId } from "./madhhab";

function profile(over: Partial<Profile> = {}): Profile {
  return {
    name: "Aisyah",
    madhhab: "syafii",
    specialState: "normal",
    location: { label: "Jakarta Selatan", lat: -6.2615, lng: 106.8106, tz: 7 },
    prayerMethod: "kemenag",
    ...over,
  };
}

/** Bleeding on [start..end], nothing logged elsewhere. */
function bleed(start: IsoDate, days: number): DayEntry[] {
  return eachDay(start, addDays(start, days - 1)).map((date) => ({
    date,
    bleeding: true,
    flow: "sedang",
    symptoms: [],
    mood: [],
  }));
}

function clean(start: IsoDate, days: number): DayEntry[] {
  return eachDay(start, addDays(start, days - 1)).map((date) => ({
    date,
    bleeding: false,
    symptoms: [],
    mood: [],
  }));
}

function statusOn(entries: DayEntry[], p: Profile, date: IsoDate, today = date) {
  const analysis = analyzeCycle({ entries, profile: p, today });
  return rulingFor(analysis, date).classification;
}

describe("haid within the school's limits", () => {
  it("rules a 7-day bleed as haid under every school that allows it", () => {
    const entries = [...bleed("2026-09-12", 7), ...clean("2026-09-19", 10)];
    for (const m of ["syafii", "maliki", "hanbali", "hanafi"] as MadhhabId[]) {
      expect(statusOn(entries, profile({ madhhab: m }), "2026-09-15")).toBe(
        Classification.HAID,
      );
    }
  });

  it("counts the day of the episode from its first day", () => {
    const entries = bleed("2026-09-12", 7);
    const analysis = analyzeCycle({
      entries,
      profile: profile(),
      today: "2026-09-15",
    });
    expect(rulingFor(analysis, "2026-09-15").dayOfEpisode).toBe(4);
  });

  it("returns to suci once bleeding stops", () => {
    const entries = [...bleed("2026-09-12", 7), ...clean("2026-09-19", 5)];
    expect(statusOn(entries, profile(), "2026-09-20")).toBe(Classification.SUCI);
  });
});

describe("bleeding shorter than the minimum", () => {
  it("is istihadhah under Hanafi (min 3) but haid under Syafi'i (min 1)", () => {
    const entries = [...bleed("2026-09-12", 2), ...clean("2026-09-14", 20)];
    expect(statusOn(entries, profile({ madhhab: "hanafi" }), "2026-09-12")).toBe(
      Classification.ISTIHADHAH,
    );
    expect(statusOn(entries, profile({ madhhab: "syafii" }), "2026-09-12")).toBe(
      Classification.HAID,
    );
  });

  it("is haid under Maliki even for a single day, which has no minimum", () => {
    const entries = [...bleed("2026-09-12", 1), ...clean("2026-09-13", 20)];
    expect(statusOn(entries, profile({ madhhab: "maliki" }), "2026-09-12")).toBe(
      Classification.HAID,
    );
  });
});

describe("bleeding longer than the maximum", () => {
  it("splits at 15 days for Syafi'i: day 15 haid, day 16 istihadhah", () => {
    const entries = bleed("2026-09-01", 20);
    const p = profile();
    expect(statusOn(entries, p, "2026-09-15", "2026-09-20")).toBe(
      Classification.HAID,
    );
    expect(statusOn(entries, p, "2026-09-16", "2026-09-20")).toBe(
      Classification.ISTIHADHAH,
    );
  });

  it("splits at 10 days for Hanafi", () => {
    const entries = bleed("2026-09-01", 20);
    const p = profile({ madhhab: "hanafi" });
    expect(statusOn(entries, p, "2026-09-10", "2026-09-20")).toBe(
      Classification.HAID,
    );
    expect(statusOn(entries, p, "2026-09-11", "2026-09-20")).toBe(
      Classification.ISTIHADHAH,
    );
  });

  it("attaches an advisory to send the user to a scholar", () => {
    const analysis = analyzeCycle({
      entries: bleed("2026-09-01", 20),
      profile: profile(),
      today: "2026-09-20",
    });
    const verdict = buildVerdict(analysis, profile(), "2026-09-15");
    expect(verdict.advisory).toBeDefined();
    expect(verdict.advisory).toContain("ulama");
  });
});

describe("minimum tuhr between two periods", () => {
  it("folds a 2-day pause into one haid episode for Syafi'i", () => {
    const entries = [
      ...bleed("2026-09-01", 4),
      ...clean("2026-09-05", 2),
      ...bleed("2026-09-07", 3),
      ...clean("2026-09-10", 20),
    ];
    const p = profile();
    // The clean days in the middle are still ruled haid, and flagged as such.
    expect(statusOn(entries, p, "2026-09-05", "2026-09-20")).toBe(
      Classification.HAID,
    );
    const analysis = analyzeCycle({ entries, profile: p, today: "2026-09-20" });
    expect(rulingFor(analysis, "2026-09-05").bridged).toBe(true);
    expect(analysis.episodes.filter((e) => e.kind === Classification.HAID)).toHaveLength(1);
  });

  it("does not fold for Maliki, which does not bridge", () => {
    const entries = [
      ...bleed("2026-09-01", 4),
      ...clean("2026-09-05", 2),
      ...bleed("2026-09-07", 3),
      ...clean("2026-09-10", 20),
    ];
    const p = profile({ madhhab: "maliki" });
    expect(statusOn(entries, p, "2026-09-05", "2026-09-20")).toBe(
      Classification.SUCI,
    );
    // The second run starts before the 15-day tuhr, so it is not a new haid.
    expect(statusOn(entries, p, "2026-09-07", "2026-09-20")).toBe(
      Classification.ISTIHADHAH,
    );
  });

  it("treats bleeding after a full tuhr as a fresh haid", () => {
    const entries = [
      ...bleed("2026-09-01", 5),
      ...clean("2026-09-06", 20),
      ...bleed("2026-09-26", 5),
      ...clean("2026-10-01", 5),
    ];
    const analysis = analyzeCycle({
      entries,
      profile: profile(),
      today: "2026-10-05",
    });
    expect(
      analysis.episodes.filter((e) => e.kind === Classification.HAID),
    ).toHaveLength(2);
  });
});

describe("life-phase overrides", () => {
  it("rules bleeding during pregnancy as haid for Syafi'i, istihadhah for Hanafi", () => {
    const entries = [...bleed("2026-09-12", 4), ...clean("2026-09-16", 10)];
    expect(
      statusOn(
        entries,
        profile({ specialState: "hamil", pregnancyLmp: "2026-04-01" }),
        "2026-09-13",
      ),
    ).toBe(Classification.HAID);
    expect(
      statusOn(
        entries,
        profile({
          madhhab: "hanafi",
          specialState: "hamil",
          pregnancyLmp: "2026-04-01",
        }),
        "2026-09-13",
      ),
    ).toBe(Classification.ISTIHADHAH);
  });

  it("rules the nifas window by the school's maximum", () => {
    const p = profile({ specialState: "nifas", nifasStart: "2026-08-01" });
    const entries = bleed("2026-08-01", 30);
    // Syafi'i allows 60 days, so day 45 is still nifas.
    expect(statusOn(entries, p, "2026-09-14", "2026-09-20")).toBe(
      Classification.NIFAS,
    );
    // Hanbali caps at 40, so the same day is past the window.
    const hanbali = profile({
      madhhab: "hanbali",
      specialState: "nifas",
      nifasStart: "2026-08-01",
    });
    expect(statusOn(entries, hanbali, "2026-09-14", "2026-09-20")).not.toBe(
      Classification.NIFAS,
    );
  });

  it("ends nifas early when ghusl is recorded", () => {
    const entries: DayEntry[] = [
      ...bleed("2026-08-01", 20),
      {
        date: "2026-08-21",
        bleeding: false,
        ghusl: true,
        symptoms: [],
        mood: [],
      },
      ...clean("2026-08-22", 10),
    ];
    const p = profile({ specialState: "nifas", nifasStart: "2026-08-01" });
    expect(statusOn(entries, p, "2026-08-25", "2026-09-01")).toBe(
      Classification.SUCI,
    );
  });

  it("rules all bleeding after menopause as istihadhah", () => {
    const entries = [...bleed("2026-09-12", 5), ...clean("2026-09-17", 5)];
    expect(
      statusOn(entries, profile({ specialState: "menopause" }), "2026-09-13"),
    ).toBe(Classification.ISTIHADHAH);
  });
});

describe("yellow discharge", () => {
  it("counts as haid for Syafi'i but not for Hanafi", () => {
    const entries: DayEntry[] = [
      ...bleed("2026-09-12", 3),
      {
        date: "2026-09-15",
        bleeding: true,
        color: "kuning",
        symptoms: [],
        mood: [],
      },
      ...clean("2026-09-16", 20),
    ];
    expect(statusOn(entries, profile(), "2026-09-15", "2026-09-20")).toBe(
      Classification.HAID,
    );
    // Hanafi discounts it, and the remaining 3 days still clear its minimum.
    const hanafi = analyzeCycle({
      entries,
      profile: profile({ madhhab: "hanafi" }),
      today: "2026-09-20",
    });
    expect(rulingFor(hanafi, "2026-09-15").classification).toBe(
      Classification.SUCI,
    );
    expect(rulingFor(hanafi, "2026-09-13").classification).toBe(
      Classification.HAID,
    );
  });
});

describe("unlogged days", () => {
  it("reads a quiet unlogged day as suci rather than nagging", () => {
    const entries = [
      ...bleed("2026-09-01", 3),
      // 2026-09-04 deliberately missing, with nothing after it to disambiguate
      ...clean("2026-09-05", 3),
    ];
    expect(statusOn(entries, profile(), "2026-09-04", "2026-09-08")).toBe(
      Classification.SUCI,
    );
  });

  it("asks for confirmation only where the answer changes the ruling", () => {
    // Bleeding on either side of an unlogged gap shorter than the minimum
    // tuhr: whether those days bled decides one episode or two.
    const entries = [
      ...bleed("2026-09-01", 3),
      // 2026-09-04 and 05 unlogged
      ...bleed("2026-09-06", 3),
      ...clean("2026-09-09", 20),
    ];
    const p = profile({ madhhab: "maliki" }); // does not bridge
    expect(statusOn(entries, p, "2026-09-04", "2026-09-20")).toBe(
      Classification.NEEDS_REVIEW,
    );
    expect(statusOn(entries, p, "2026-09-05", "2026-09-20")).toBe(
      Classification.NEEDS_REVIEW,
    );
  });

  it("does not ask when the gap is longer than the minimum tuhr", () => {
    const entries = [
      ...bleed("2026-09-01", 3),
      // a long unlogged stretch, then a clearly separate period
      ...bleed("2026-10-05", 3),
      ...clean("2026-10-08", 5),
    ];
    expect(statusOn(entries, profile(), "2026-09-15", "2026-10-12")).toBe(
      Classification.SUCI,
    );
  });

  it("treats days after the last log as suci, not unknown", () => {
    const entries = [...bleed("2026-09-01", 3), ...clean("2026-09-04", 2)];
    expect(statusOn(entries, profile(), "2026-09-07", "2026-09-08")).toBe(
      Classification.SUCI,
    );
  });
});

describe("worship implications", () => {
  it("drops prayer without qadha during haid, and owes the fast", () => {
    const analysis = analyzeCycle({
      entries: bleed("2026-09-12", 5),
      profile: profile(),
      today: "2026-09-14",
    });
    const v = buildVerdict(analysis, profile(), "2026-09-14");
    expect(v.prayerObligatory).toBe(false);
    expect(v.prayerRequiresQadha).toBe(false);
    expect(v.fastObligatory).toBe(false);
    expect(v.fastRequiresQadha).toBe(true);
  });

  it("keeps prayer obligatory during istihadhah", () => {
    const entries = [...bleed("2026-09-12", 2), ...clean("2026-09-14", 5)];
    const p = profile({ madhhab: "hanafi" });
    const analysis = analyzeCycle({ entries, profile: p, today: "2026-09-13" });
    const v = buildVerdict(analysis, p, "2026-09-13");
    expect(v.classification).toBe(Classification.ISTIHADHAH);
    expect(v.prayerObligatory).toBe(true);
    expect(v.fastObligatory).toBe(true);
  });

  it("always carries a citation and a reasoning trail", () => {
    const analysis = analyzeCycle({
      entries: bleed("2026-09-12", 5),
      profile: profile(),
      today: "2026-09-14",
    });
    const v = buildVerdict(analysis, profile(), "2026-09-14");
    expect(v.citation.work).toBeTruthy();
    expect(v.steps.length).toBeGreaterThan(0);
  });
});

describe("prediction", () => {
  it("projects the next period from the average of past cycles", () => {
    const entries = [
      ...bleed("2026-06-01", 5),
      ...clean("2026-06-06", 23),
      ...bleed("2026-06-29", 5),
      ...clean("2026-07-04", 23),
      ...bleed("2026-07-27", 5),
      ...clean("2026-08-01", 10),
    ];
    const analysis = analyzeCycle({
      entries,
      profile: profile(),
      today: "2026-08-10",
    });
    expect(analysis.averageCycleLength).toBe(28);
    expect(analysis.averageHaidLength).toBe(5);
    expect(analysis.nextPredictedStart).toBe("2026-08-24");
    expect(rulingFor(analysis, "2026-08-25").classification).toBe(
      Classification.PREDICTED_HAID,
    );
  });

  it("makes no prediction from a single recorded cycle", () => {
    const analysis = analyzeCycle({
      entries: [...bleed("2026-09-01", 5), ...clean("2026-09-06", 5)],
      profile: profile(),
      today: "2026-09-10",
    });
    expect(analysis.averageCycleLength).toBeUndefined();
    expect(analysis.predicted.size).toBe(0);
  });
});
