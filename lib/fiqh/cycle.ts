import {
  addDays,
  daysBetween,
  eachDay,
  inclusiveDays,
  type IsoDate,
} from "@/lib/date";
import { getMadhhab, type MadhhabRules } from "./madhhab";
import {
  Classification,
  type CycleAnalysis,
  type DayEntry,
  type DayRuling,
  type Episode,
  type Profile,
} from "./types";

/**
 * The cycle engine.
 *
 * Turns a list of daily logs into a per-day ruling, using only the numbers in
 * `madhhab.ts`. The pipeline is:
 *
 *   1. decide which logged days count as bleeding for THIS school
 *   2. group those into runs of consecutive days
 *   3. merge runs whose gap is shorter than the minimum tuhr (if the school
 *      bridges), so a two-day pause does not fake a second period
 *   4. rule each merged episode: too short → istihadhah; otherwise haid up to
 *      the maximum, with the overflow as istihadhah
 *   5. fill in suci, and mark unlogged gaps as NEEDS_REVIEW rather than
 *      guessing
 *
 * Life-phase overrides (pregnancy, nifas, menopause) short-circuit step 4.
 */

/** Does this day count as bleeding under this school's colour rule? */
function countsAsBleeding(entry: DayEntry, rules: MadhhabRules): boolean {
  if (!entry.bleeding) return false;
  const weak = entry.color === "kuning" || entry.color === "keruh";
  if (weak && !rules.yellowDischargeIsHaid) return false;
  return true;
}

interface Run {
  start: IsoDate;
  end: IsoDate;
}

function groupRuns(days: IsoDate[]): Run[] {
  const runs: Run[] = [];
  for (const day of days) {
    const last = runs[runs.length - 1];
    if (last && daysBetween(last.end, day) === 1) last.end = day;
    else runs.push({ start: day, end: day });
  }
  return runs;
}

/**
 * Merges runs separated by fewer than `minTuhrDays` clean days. The clean days
 * in between are absorbed into the episode — under Syafi'i's sahb they are
 * still ruled haid, which is why the days they cover get `bridged: true` so
 * the UI can say as much rather than presenting it as ordinary bleeding.
 */
function mergeShortTuhr(runs: Run[], rules: MadhhabRules): Run[] {
  if (!rules.bridgeShortTuhr || runs.length < 2) return runs;
  const merged: Run[] = [{ ...runs[0] }];
  for (let i = 1; i < runs.length; i++) {
    const prev = merged[merged.length - 1];
    const gap = daysBetween(prev.end, runs[i].start) - 1;
    const wouldSpan = inclusiveDays(prev.start, runs[i].end);
    // Only bridge when the result still fits inside one lawful haid. A gap
    // shorter than the minimum tuhr that would produce a 40-day "episode" is
    // past what this engine models; leave it split and let step 4 flag it.
    if (gap < rules.minTuhrDays && wouldSpan <= rules.haidMaxDays) {
      prev.end = runs[i].end;
    } else {
      merged.push({ ...runs[i] });
    }
  }
  return merged;
}

export interface AnalyzeOptions {
  entries: DayEntry[];
  profile: Profile;
  today: IsoDate;
  /** How far past today to project predictions. */
  horizonDays?: number;
}

export function analyzeCycle({
  entries,
  profile,
  today,
  horizonDays = 120,
}: AnalyzeOptions): CycleAnalysis {
  const rules = getMadhhab(profile.madhhab);
  const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const byDate = new Map(sorted.map((e) => [e.date, e]));

  const rulings = new Map<IsoDate, DayRuling>();
  const episodes: Episode[] = [];

  /* ---- Nifas overrides everything inside its window ------------------- */
  const nifasWindow =
    profile.specialState === "nifas" && profile.nifasStart
      ? {
          start: profile.nifasStart,
          // The window ends at the school's maximum, or earlier if bleeding
          // stopped and ghusl was recorded — screen 17a promises exactly this.
          end: nifasEnd(profile.nifasStart, sorted, rules),
        }
      : undefined;

  if (nifasWindow) {
    const id = `nifas-${nifasWindow.start}`;
    episodes.push({
      id,
      start: nifasWindow.start,
      end: nifasWindow.end,
      kind: Classification.NIFAS,
      length: inclusiveDays(nifasWindow.start, nifasWindow.end),
    });
    eachDay(nifasWindow.start, nifasWindow.end).forEach((d, i) => {
      rulings.set(d, {
        date: d,
        classification: Classification.NIFAS,
        dayOfEpisode: i + 1,
        episodeId: id,
      });
    });
  }

  /* ---- Bleeding days, minus anything nifas already claimed ------------ */
  const bleedingDays = sorted
    .filter((e) => countsAsBleeding(e, rules))
    .map((e) => e.date)
    .filter((d) => !rulings.has(d));

  const runs = mergeShortTuhr(groupRuns(bleedingDays), rules);

  /* ---- Rule each episode ---------------------------------------------- */
  let lastHaidEnd: IsoDate | undefined;

  for (const run of runs) {
    const span = inclusiveDays(run.start, run.end);
    const id = `ep-${run.start}`;

    // Life phases that rule out haid entirely.
    const phaseBlocksHaid =
      (profile.specialState === "hamil" && !rules.haidDuringPregnancy) ||
      profile.specialState === "menopause";

    // Too soon after the previous haid to start a new one.
    const tuhrGap = lastHaidEnd
      ? daysBetween(lastHaidEnd, run.start) - 1
      : Infinity;
    const tuhrTooShort = tuhrGap < rules.minTuhrDays;

    const tooShort = span < rules.haidMinDays;

    if (phaseBlocksHaid || tooShort || tuhrTooShort) {
      pushEpisode(episodes, rulings, {
        id,
        start: run.start,
        end: run.end,
        kind: Classification.ISTIHADHAH,
        length: span,
      });
      continue;
    }

    const haidEnd =
      span > rules.haidMaxDays
        ? addDays(run.start, rules.haidMaxDays - 1)
        : run.end;

    pushEpisode(episodes, rulings, {
      id,
      start: run.start,
      end: haidEnd,
      kind: Classification.HAID,
      length: inclusiveDays(run.start, haidEnd),
      truncatedAt: span > rules.haidMaxDays ? haidEnd : undefined,
    });
    lastHaidEnd = haidEnd;

    // Overflow past the maximum is istihadhah.
    if (span > rules.haidMaxDays) {
      const overflowStart = addDays(haidEnd, 1);
      pushEpisode(episodes, rulings, {
        id: `${id}-overflow`,
        start: overflowStart,
        end: run.end,
        kind: Classification.ISTIHADHAH,
        length: inclusiveDays(overflowStart, run.end),
      });
    }
  }

  // Clean days swallowed by a bridged episode are flagged, so the UI can
  // explain why a day with no bleeding logged is still ruled haid.
  for (const [date, ruling] of rulings) {
    const entry = byDate.get(date);
    if (
      ruling.classification === Classification.HAID &&
      (!entry || !countsAsBleeding(entry, rules))
    ) {
      ruling.bridged = true;
    }
  }

  /* ---- Fill the gaps --------------------------------------------------- */

  /**
   * Days with no entry are read as suci — most people only open the app when
   * something is happening, and demanding confirmation for every quiet day
   * would bury the cases that matter.
   *
   * The exception is a gap that is short enough to change the ruling: an
   * unlogged run between two bleeding days, closer together than the minimum
   * tuhr, decides whether this is one episode or two. There the app asks
   * instead of guessing.
   */
  const ambiguous = new Set<IsoDate>();
  for (let i = 1; i < runs.length; i++) {
    const gapStart = addDays(runs[i - 1].end, 1);
    const gapEnd = addDays(runs[i].start, -1);
    if (gapStart > gapEnd) continue;
    if (inclusiveDays(gapStart, gapEnd) >= rules.minTuhrDays) continue;
    for (const day of eachDay(gapStart, gapEnd)) {
      if (!byDate.has(day)) ambiguous.add(day);
    }
  }

  const firstLogged = sorted[0]?.date;
  const lastLogged = sorted[sorted.length - 1]?.date;

  if (firstLogged) {
    const to = lastLogged > today ? lastLogged : today;
    for (const day of eachDay(firstLogged, to)) {
      if (rulings.has(day)) continue;
      rulings.set(day, {
        date: day,
        classification: ambiguous.has(day)
          ? Classification.NEEDS_REVIEW
          : Classification.SUCI,
      });
    }
  }

  /* ---- Averages and prediction ---------------------------------------- */
  const haidEpisodes = episodes.filter(
    (e) => e.kind === Classification.HAID,
  );
  const starts = haidEpisodes.map((e) => e.start).sort();

  let averageCycleLength: number | undefined;
  if (starts.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) {
      gaps.push(daysBetween(starts[i - 1], starts[i]));
    }
    averageCycleLength = Math.round(
      gaps.reduce((a, b) => a + b, 0) / gaps.length,
    );
  }

  const averageHaidLength = haidEpisodes.length
    ? Math.round(
        haidEpisodes.reduce((a, e) => a + e.length, 0) / haidEpisodes.length,
      )
    : undefined;

  const current = episodes.find(
    (e) =>
      (e.kind === Classification.HAID || e.kind === Classification.NIFAS) &&
      e.start <= today &&
      today <= e.end,
  );

  const predicted = new Set<IsoDate>();
  let nextPredictedStart: IsoDate | undefined;

  if (starts.length && averageCycleLength && averageHaidLength) {
    const horizonEnd = addDays(today, horizonDays);
    let next = addDays(starts[starts.length - 1], averageCycleLength);
    // Roll forward past any cycle already recorded or in progress.
    while (next <= today || (current && next <= current.end)) {
      next = addDays(next, averageCycleLength);
    }
    nextPredictedStart = next;
    while (next <= horizonEnd) {
      for (let i = 0; i < averageHaidLength; i++) {
        predicted.add(addDays(next, i));
      }
      next = addDays(next, averageCycleLength);
    }
  }

  return {
    rulings,
    episodes,
    current,
    averageCycleLength,
    averageHaidLength,
    nextPredictedStart,
    predicted,
  };
}

function pushEpisode(
  episodes: Episode[],
  rulings: Map<IsoDate, DayRuling>,
  episode: Episode,
) {
  episodes.push(episode);
  eachDay(episode.start, episode.end).forEach((d, i) => {
    rulings.set(d, {
      date: d,
      classification: episode.kind,
      dayOfEpisode: i + 1,
      episodeId: episode.id,
    });
  });
}

/**
 * Where the nifas window ends: at the school's maximum, or on the day ghusl
 * was recorded after bleeding stopped — "kalau darah berhenti sebelum 60 hari,
 * kamu mandi wajib dan langsung kembali shalat" (screen 17a).
 */
function nifasEnd(
  start: IsoDate,
  entries: DayEntry[],
  rules: MadhhabRules,
): IsoDate {
  const hardMax = addDays(start, rules.nifasMaxDays - 1);
  const ghusl = entries.find(
    (e) => e.ghusl && e.date >= start && e.date <= hardMax,
  );
  if (!ghusl) return hardMax;
  // Ghusl ends the window on the day it happened.
  return ghusl.date;
}

/** Convenience: the ruling for one day, defaulting to suci outside any log. */
export function rulingFor(
  analysis: CycleAnalysis,
  date: IsoDate,
): DayRuling {
  return (
    analysis.rulings.get(date) ?? {
      date,
      classification: analysis.predicted.has(date)
        ? Classification.PREDICTED_HAID
        : Classification.SUCI,
    }
  );
}
