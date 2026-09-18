import { addDays, daysBetween, toDate, toIso, type IsoDate } from "@/lib/date";

/**
 * Hijri calendar by hisab, using the same moon-sighting criteria Kemenag
 * adopted in 2021 (MABIMS): a new month begins the evening after
 * conjunction only if, at that sunset, the moon's altitude is at least 3°
 * and its elongation from the sun at least 6.4°. Otherwise the current
 * month runs a 30th day (istikmal) and the new month starts the evening
 * after that.
 *
 * This is a calculation, not an observation, and not a substitute for
 * Kemenag's own sidang isbat. It exists to be usually right and always
 * honest about the gap: every screen that shows a date derived from this
 * file must say it is a hisab estimate, especially near the start of
 * Ramadan, Syawal, or Dzulhijjah, where a day's difference changes when a
 * fast begins or ends.
 *
 * Verified against the two dates from 1446H that were most widely reported
 * in Indonesia (see hijri.test.ts): 1 Ramadan 1446H = 1 Maret 2025 (a 30-day
 * Sya'ban), and 1 Syawal 1446H = 31 Maret 2025 (a 30-day Ramadan, istikmal —
 * the hilal was not deemed visible at the 29-day mark).
 */

const DEG = Math.PI / 180;
const sin = (d: number) => Math.sin(d * DEG);
const cos = (d: number) => Math.cos(d * DEG);
const tan = (d: number) => Math.tan(d * DEG);
const arcsin = (x: number) => Math.asin(Math.min(1, Math.max(-1, x))) / DEG;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

/* ---------------------------- Julian day <-> date ------------------------- */

function julianDay(y: number, m: number, d: number, hourUtc = 0): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d +
    hourUtc / 24 +
    b -
    1524.5
  );
}

function isoToJd(iso: IsoDate): number {
  const d = toDate(iso);
  return julianDay(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Inverse of `julianDay`, the standard Meeus algorithm. Returns a UTC ISO date. */
function jdToIso(jd: number): IsoDate {
  const jdAdj = jd + 0.5;
  const Z = Math.floor(jdAdj);
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = Math.floor(B - D - Math.floor(30.6001 * E));
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return toIso(new Date(year, month - 1, day));
}

/* ---------------------------- solar & lunar position ----------------------- */

/** Geocentric apparent ecliptic longitude of the sun, degrees. ~0.01° accuracy. */
function sunEclipticLongitude(jd: number): number {
  const d = jd - 2451545.0;
  const g = norm360(357.529 + 0.98560028 * d);
  const q = norm360(280.459 + 0.98564736 * d);
  return norm360(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
}

interface MoonPosition {
  longitude: number;
  latitude: number;
  distanceKm: number;
}

/**
 * Geocentric apparent lunar position: truncated Meeus low-precision series
 * (the dominant periodic terms only). Good to a few arcminutes in longitude
 * and latitude — comfortably inside the degree-scale MABIMS thresholds.
 */
function moonPosition(jd: number): MoonPosition {
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm360(218.3164477 + 481267.88123421 * T);
  const D = norm360(297.8501921 + 445267.1114034 * T);
  const M = norm360(357.5291092 + 35999.0502909 * T);
  const Mp = norm360(134.9633964 + 477198.8675055 * T);
  const F = norm360(93.272095 + 483202.0175233 * T);

  const dLon =
    6.288774 * sin(Mp) +
    1.274027 * sin(2 * D - Mp) +
    0.658314 * sin(2 * D) +
    0.213618 * sin(2 * Mp) -
    0.185116 * sin(M) -
    0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * Mp) +
    0.057066 * sin(2 * D - M - Mp) +
    0.053322 * sin(2 * D + Mp) +
    0.04576 * sin(2 * D - M) -
    0.040923 * sin(M - Mp) -
    0.03472 * sin(D) -
    0.030383 * sin(M + Mp);

  const dLat =
    5.128122 * sin(F) +
    0.280602 * sin(Mp + F) +
    0.277693 * sin(Mp - F) +
    0.173237 * sin(2 * D - F) +
    0.055413 * sin(2 * D - Mp + F) +
    0.046271 * sin(2 * D - Mp - F) +
    0.032573 * sin(2 * D + F) +
    0.017198 * sin(2 * Mp + F);

  const distanceKm =
    385000.56 -
    20905.355 * cos(Mp) -
    3699.111 * cos(2 * D - Mp) -
    2955.968 * cos(2 * D) -
    569.925 * cos(2 * Mp);

  return { longitude: norm360(Lp + dLon), latitude: dLat, distanceKm };
}

function obliquity(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  return 23.4392911 - 0.0130042 * T;
}

/** Moon altitude (topocentric, parallax-corrected) and elongation from the
 *  sun, both in degrees, at the given moment and observer location. */
function moonAltitudeAndElongation(
  jd: number,
  lat: number,
  lng: number,
): { altitude: number; elongation: number } {
  const sunLon = sunEclipticLongitude(jd);
  const moon = moonPosition(jd);
  const eps = obliquity(jd);

  const dLon = moon.longitude - sunLon;
  const cosElong = cos(moon.latitude) * cos(dLon);
  const elongation = Math.acos(Math.min(1, Math.max(-1, cosElong))) / DEG;

  const sinDec =
    sin(moon.latitude) * cos(eps) +
    cos(moon.latitude) * sin(eps) * sin(moon.longitude);
  const dec = arcsin(sinDec);
  const raY = sin(moon.longitude) * cos(eps) - tan(moon.latitude) * sin(eps);
  const raX = cos(moon.longitude);
  const ra = norm360(Math.atan2(raY, raX) / DEG);

  const T = (jd - 2451545.0) / 36525;
  const gmst = norm360(
    280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T -
      (T * T * T) / 38710000,
  );
  const lst = norm360(gmst + lng);
  let ha = norm360(lst - ra);
  if (ha > 180) ha -= 360;

  const sinAlt = sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(ha);
  const geocentricAltitude = arcsin(sinAlt);

  // First-order topocentric correction: the moon is close enough that
  // parallax (~0.9-1°) matters against a 3° threshold.
  const horizontalParallax = arcsin(6378.14 / moon.distanceKm);
  const altitude =
    geocentricAltitude - horizontalParallax * cos(geocentricAltitude);

  return { altitude, elongation };
}

/* ---------------------------- sunset ---------------------------------------
   Mirrors lib/fiqh/prayer-times.ts's own method exactly, so this file's
   notion of "sunset" always matches the times shown on the Ibadah screen. */

function sunDeclinationAndEqt(jd: number): { declination: number; eqt: number } {
  const d = jd - 2451545.0;
  const g = norm360(357.529 + 0.98560028 * d);
  const q = norm360(280.459 + 0.98564736 * d);
  const L = norm360(q + 1.915 * sin(g) + 0.02 * sin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const declination = arcsin(sin(e) * sin(L));
  const RA = (Math.atan2(cos(e) * sin(L), cos(L)) / DEG / 15 + 24) % 24;
  const eqt = (q / 15 - RA) * 60;
  return { declination, eqt };
}

function hourAngleFor(altitude: number, lat: number, declination: number): number | null {
  const x =
    (sin(altitude) - sin(lat) * sin(declination)) / (cos(lat) * cos(declination));
  if (x < -1 || x > 1) return null;
  return Math.acos(x) / DEG / 15;
}

/** UT Julian Day of local sunset (−0.833° horizon) for a calendar date. */
function sunsetJd(
  dateIso: IsoDate,
  lat: number,
  lng: number,
  tzHours: number,
): number | null {
  const jd = isoToJd(dateIso) - lng / (15 * 24);
  const { declination, eqt } = sunDeclinationAndEqt(jd);
  const dhuhrLocalHours = 12 + tzHours - lng / 15 - eqt / 60;
  const ha = hourAngleFor(-0.833, lat, declination);
  if (ha === null) return null;
  const sunsetLocalHours = dhuhrLocalHours + ha;
  const sunsetUtHours = sunsetLocalHours - tzHours;
  return isoToJd(dateIso) + sunsetUtHours / 24;
}

/* ---------------------------- conjunction search ---------------------------- */

/** Mean new moon for synodic-month index k relative to the 2000-01-06 epoch. */
function meanNewMoonJd(k: number): number {
  const T = k / 1236.85;
  return (
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T * T -
    0.00000015 * T * T * T
  );
}

/** Signed elongation (moon minus sun ecliptic longitude), in (-180, 180]. */
function signedElongation(jd: number): number {
  const diff = norm360(moonPosition(jd).longitude - sunEclipticLongitude(jd));
  return diff > 180 ? diff - 360 : diff;
}

/** Refines a conjunction guess via fixed-point iteration on elongation. */
function refineConjunction(jdGuess: number): number {
  let jd = jdGuess;
  for (let i = 0; i < 8; i++) {
    jd -= signedElongation(jd) / 12.190749;
  }
  return jd;
}

/** True conjunction (astronomical new moon) nearest to `jd`. */
function nearestConjunction(jd: number): number {
  const k = Math.round((jd - 2451550.09766) / 29.530588861);
  return refineConjunction(meanNewMoonJd(k));
}

/** True conjunction strictly before `jd`. */
function conjunctionBefore(jd: number): number {
  let c = nearestConjunction(jd);
  if (c >= jd) c = refineConjunction(c - 29.530588861);
  return c;
}

/** True conjunction strictly after `jd`. */
function conjunctionAfter(jd: number): number {
  let c = nearestConjunction(jd);
  if (c <= jd) c = refineConjunction(c + 29.530588861);
  return c;
}

/* ---------------------------- MABIMS criteria -------------------------------- */

export interface HilalCheck {
  altitude: number;
  elongation: number;
  /** MABIMS: altitude >= 3 deg AND elongation >= 6.4 deg. */
  meetsMabims: boolean;
}

/** Evaluates the MABIMS criteria at local sunset on `dateIso`. */
export function hilalAtSunset(
  dateIso: IsoDate,
  lat: number,
  lng: number,
  tzHours: number,
): HilalCheck | null {
  const jd = sunsetJd(dateIso, lat, lng, tzHours);
  if (jd === null) return null;
  const { altitude, elongation } = moonAltitudeAndElongation(jd, lat, lng);
  return { altitude, elongation, meetsMabims: altitude >= 3 && elongation >= 6.4 };
}

/**
 * The Gregorian date on which the new Hijri month begins — i.e. the day
 * whose evening starts it, labelled by the following calendar date, which
 * is where most of that Hijri day falls.
 */
function monthStartAfter(
  conjunctionJd: number,
  lat: number,
  lng: number,
  tzHours: number,
): IsoDate {
  let candidate = jdToIso(conjunctionJd);
  const firstSunset = sunsetJd(candidate, lat, lng, tzHours);
  if (firstSunset === null || firstSunset < conjunctionJd) {
    candidate = addDays(candidate, 1);
  }
  for (let i = 0; i < 4; i++) {
    const check = hilalAtSunset(candidate, lat, lng, tzHours);
    if (check?.meetsMabims) return addDays(candidate, 1);
    candidate = addDays(candidate, 1);
  }
  // Should not be reached at these latitudes — MABIMS is essentially always
  // met within two evenings of a conjunction — but never loop forever.
  return addDays(candidate, 1);
}

/* ---------------------------- calendar -------------------------------------- */

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabiul Awal",
  "Rabiul Akhir",
  "Jumadil Awal",
  "Jumadil Akhir",
  "Rajab",
  "Sya'ban",
  "Ramadan",
  "Syawal",
  "Dzulqa'dah",
  "Dzulhijjah",
] as const;

export interface HijriDate {
  day: number;
  month: number; // 1-12
  monthName: string;
  year: number;
  /** The Gregorian date this Hijri day began on the evening before. */
  monthStart: IsoDate;
}

/**
 * The reference point every query is counted from: 1 Ramadan 1446H, whose
 * Gregorian date (1 Maret 2025) is independently well documented — Kemenag,
 * NU, and Muhammadiyah all agreed on it that year. Anchoring here, rather
 * than deriving the epoch from scratch, keeps the one hard-coded fact in
 * this file checkable against a public record instead of trusted blind.
 */
const ANCHOR_ISO: IsoDate = "2025-03-01";
const ANCHOR_MONTH = 9; // Ramadan
const ANCHOR_YEAR = 1446;
// A representative national reference point, matching the prayer-times
// module's own default. Kemenag's own hisab is likewise a single national
// calculation, not one that changes city to city.
const REF_LAT = -6.2615;
const REF_LNG = 106.8106;
const REF_TZ = 7;

interface MonthAnchor {
  start: IsoDate;
  month: number;
  year: number;
}

function stepMonth(anchor: MonthAnchor, forward: boolean): MonthAnchor {
  const startJd = isoToJd(anchor.start);

  if (forward) {
    // A point safely inside the current month: after its own defining
    // conjunction, well before the next one (~29.5 days away).
    const conjunction = conjunctionAfter(startJd + 15);
    const newStart = monthStartAfter(conjunction, REF_LAT, REF_LNG, REF_TZ);
    const month = anchor.month === 12 ? 1 : anchor.month + 1;
    const year = anchor.month === 12 ? anchor.year + 1 : anchor.year;
    return { start: newStart, month, year };
  }

  // A point safely between the previous month's conjunction and this
  // month's own — past the few days it takes MABIMS to be met, short of a
  // full synodic month back.
  const conjunction = conjunctionBefore(startJd - 10);
  const newStart = monthStartAfter(conjunction, REF_LAT, REF_LNG, REF_TZ);
  const month = anchor.month === 1 ? 12 : anchor.month - 1;
  const year = anchor.month === 1 ? anchor.year - 1 : anchor.year;
  return { start: newStart, month, year };
}

/** Walks the anchor forward or backward, one real (hisab-determined) month
 *  at a time, until it straddles `targetIso`. */
function monthContaining(targetIso: IsoDate): MonthAnchor {
  let anchor: MonthAnchor = {
    start: ANCHOR_ISO,
    month: ANCHOR_MONTH,
    year: ANCHOR_YEAR,
  };

  // Safety bound: two centuries of months is far more than this app will
  // ever be asked to resolve, and stops a bad date input from looping.
  const MAX_STEPS = 2500;
  let steps = 0;

  while (daysBetween(anchor.start, targetIso) < 0 && steps < MAX_STEPS) {
    anchor = stepMonth(anchor, false);
    steps++;
  }
  while (steps < MAX_STEPS) {
    const next = stepMonth(anchor, true);
    if (daysBetween(next.start, targetIso) < 0) break;
    anchor = next;
    steps++;
  }
  return anchor;
}

/** The Hijri calendar date, by hisab, for a given Gregorian ISO date. */
export function hijriForDate(dateIso: IsoDate): HijriDate {
  const anchor = monthContaining(dateIso);
  const day = daysBetween(anchor.start, dateIso) + 1;
  return {
    day,
    month: anchor.month,
    monthName: HIJRI_MONTHS[anchor.month - 1],
    year: anchor.year,
    monthStart: anchor.start,
  };
}

/** "17 Ramadan 1446 H" */
export function formatHijri(h: HijriDate): string {
  return `${h.day} ${h.monthName} ${h.year} H`;
}
