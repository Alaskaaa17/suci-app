import { toDate, type IsoDate } from "@/lib/date";
import type { PrayerMethodId } from "./types";

/**
 * Solar prayer-time calculation.
 *
 * Standard astronomical method: compute the sun's declination and the equation
 * of time for the day, then solve the hour angle for each prayer's defining
 * solar altitude. Accurate to about a minute at Indonesian latitudes, which is
 * what a companion app needs; it is not a substitute for a local mosque's
 * published schedule.
 */

export interface PrayerMethod {
  id: PrayerMethodId;
  label: string;
  /** Sun depression angle below the horizon at Fajr, in degrees. */
  fajrAngle: number;
  /** Isha as a depression angle, or a fixed offset after Maghrib. */
  isha: { angle: number } | { minutesAfterMaghrib: number };
  /** Shadow-length multiplier for Asr. 1 = Syafi'i/Maliki/Hanbali, 2 = Hanafi. */
  asrFactor: 1 | 2;
  /** Safety margin added to each time, as Kemenag's schedules do. */
  ihtiyatMinutes: number;
}

export const PRAYER_METHODS: Record<PrayerMethodId, PrayerMethod> = {
  kemenag: {
    id: "kemenag",
    label: "Kemenag RI",
    fajrAngle: 20,
    isha: { angle: 18 },
    asrFactor: 1,
    ihtiyatMinutes: 2,
  },
  mwl: {
    id: "mwl",
    label: "Muslim World League",
    fajrAngle: 18,
    isha: { angle: 17 },
    asrFactor: 1,
    ihtiyatMinutes: 0,
  },
  isna: {
    id: "isna",
    label: "ISNA",
    fajrAngle: 15,
    isha: { angle: 15 },
    asrFactor: 1,
    ihtiyatMinutes: 0,
  },
  egypt: {
    id: "egypt",
    label: "Egyptian General Authority",
    fajrAngle: 19.5,
    isha: { angle: 17.5 },
    asrFactor: 1,
    ihtiyatMinutes: 0,
  },
  makkah: {
    id: "makkah",
    label: "Umm al-Qura, Makkah",
    fajrAngle: 18.5,
    isha: { minutesAfterMaghrib: 90 },
    asrFactor: 1,
    ihtiyatMinutes: 0,
  },
};

export const PRAYER_METHOD_ORDER: PrayerMethodId[] = [
  "kemenag",
  "mwl",
  "isna",
  "egypt",
  "makkah",
];

export type PrayerName =
  | "imsak"
  | "subuh"
  | "terbit"
  | "zuhur"
  | "asar"
  | "magrib"
  | "isya";

export interface PrayerTime {
  name: PrayerName;
  label: string;
  /** Minutes from local midnight. */
  minutes: number;
  /** "04:32" */
  time: string;
  /** Imsak and sunrise are markers, not prayers. */
  isPrayer: boolean;
}

const LABELS: Record<PrayerName, string> = {
  imsak: "Imsak",
  subuh: "Subuh",
  terbit: "Terbit",
  zuhur: "Zuhur",
  asar: "Asar",
  magrib: "Magrib",
  isya: "Isya",
};

const DEG = Math.PI / 180;

function sin(d: number) {
  return Math.sin(d * DEG);
}
function cos(d: number) {
  return Math.cos(d * DEG);
}
function tan(d: number) {
  return Math.tan(d * DEG);
}
function arcsin(x: number) {
  return Math.asin(x) / DEG;
}
function arccos(x: number) {
  return Math.acos(x) / DEG;
}
function arccot(x: number) {
  return Math.atan(1 / x) / DEG;
}

/** Julian Day Number for a calendar date at 00:00 UT. */
function julianDate(y: number, m: number, d: number): number {
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
    b -
    1524.5
  );
}

/** Sun declination (deg) and equation of time (minutes) for a Julian day. */
function sunPosition(jd: number): { declination: number; eqt: number } {
  const d = jd - 2451545.0;
  const g = (357.529 + 0.98560028 * d) % 360; // mean anomaly
  const q = (280.459 + 0.98564736 * d) % 360; // mean longitude
  const L = (q + 1.915 * sin(g) + 0.02 * sin(2 * g)) % 360; // ecliptic longitude
  const e = 23.439 - 0.00000036 * d; // obliquity

  const declination = arcsin(sin(e) * sin(L));
  const RA = (Math.atan2(cos(e) * sin(L), cos(L)) / DEG / 15 + 24) % 24;
  const eqt = (q / 15 - RA) * 60;

  return { declination, eqt };
}

/**
 * Hour angle, in hours, for the sun to reach `altitude` degrees above the
 * horizon. Returns null at latitudes where that never happens on this day —
 * the polar case, which Indonesian users will never hit but which must not
 * silently produce NaN.
 */
function hourAngle(
  altitude: number,
  latitude: number,
  declination: number,
): number | null {
  const x =
    (sin(altitude) - sin(latitude) * sin(declination)) /
    (cos(latitude) * cos(declination));
  if (x < -1 || x > 1) return null;
  return arccos(x) / 15;
}

export interface PrayerTimesInput {
  date: IsoDate;
  lat: number;
  lng: number;
  method: PrayerMethodId;
  /** Offset from UTC in hours. Defaults to the runtime's own offset. */
  timezone?: number;
}

export function computePrayerTimes({
  date,
  lat,
  lng,
  method,
  timezone,
}: PrayerTimesInput): PrayerTime[] {
  const cfg = PRAYER_METHODS[method];
  const d = toDate(date);
  const tz =
    timezone ?? -new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTimezoneOffset() / 60;

  const jd = julianDate(d.getFullYear(), d.getMonth() + 1, d.getDate()) - lng / (15 * 24);
  const { declination, eqt } = sunPosition(jd);

  // Solar noon in local clock time, in hours.
  const dhuhr = 12 + tz - lng / 15 - eqt / 60;

  const at = (altitude: number, before: boolean): number | null => {
    const ha = hourAngle(altitude, lat, declination);
    if (ha === null) return null;
    return before ? dhuhr - ha : dhuhr + ha;
  };

  // -0.833° accounts for refraction and the sun's apparent radius.
  const HORIZON = -0.833;
  const sunrise = at(HORIZON, true);
  const maghrib = at(HORIZON, false);
  const fajr = at(-cfg.fajrAngle, true);

  // Asr: the sun's altitude when an object's shadow equals its own length
  // (plus the noon shadow) times the school's factor.
  const asrAltitude = arccot(cfg.asrFactor + tan(Math.abs(lat - declination)));
  const asr = at(asrAltitude, false);

  const isha =
    "angle" in cfg.isha
      ? at(-cfg.isha.angle, false)
      : maghrib === null
        ? null
        : maghrib + cfg.isha.minutesAfterMaghrib / 60;

  // Imsak is conventionally 10 minutes before Subuh in Indonesian schedules.
  const imsak = fajr === null ? null : fajr - 10 / 60;

  const entries: Array<[PrayerName, number | null, boolean, number]> = [
    ["imsak", imsak, false, -cfg.ihtiyatMinutes],
    ["subuh", fajr, true, cfg.ihtiyatMinutes],
    ["terbit", sunrise, false, -cfg.ihtiyatMinutes],
    ["zuhur", dhuhr, true, cfg.ihtiyatMinutes],
    ["asar", asr, true, cfg.ihtiyatMinutes],
    ["magrib", maghrib, true, cfg.ihtiyatMinutes],
    ["isya", isha, true, cfg.ihtiyatMinutes],
  ];

  return entries.map(([name, hours, isPrayer, ihtiyat]) => {
    const minutes =
      hours === null ? NaN : Math.round(hours * 60) + ihtiyat;
    return {
      name,
      label: LABELS[name],
      minutes,
      time: Number.isNaN(minutes) ? "-" : formatClock(minutes),
      isPrayer,
    };
  });
}

export function formatClock(minutesFromMidnight: number): string {
  const wrapped = ((minutesFromMidnight % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = Math.round(wrapped % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The next prayer after `nowMinutes`, with how long until it. Wraps to
 * tomorrow's Subuh after Isya so the countdown never reads negative.
 */
export function nextPrayer(
  times: PrayerTime[],
  nowMinutes: number,
): { prayer: PrayerTime; minutesUntil: number } | null {
  const prayers = times.filter((t) => t.isPrayer && !Number.isNaN(t.minutes));
  if (!prayers.length) return null;
  const upcoming = prayers.find((p) => p.minutes > nowMinutes);
  if (upcoming) {
    return { prayer: upcoming, minutesUntil: upcoming.minutes - nowMinutes };
  }
  const first = prayers[0];
  return { prayer: first, minutesUntil: 1440 - nowMinutes + first.minutes };
}

/**
 * A few Indonesian cities, so Pengaturan has something to pick from offline.
 *
 * Each carries its UTC offset. The schedule must follow the chosen location,
 * not the device clock — otherwise someone who picks Makassar (WITA) while
 * their phone is still on WIB gets times an hour out, and the whole page is
 * quietly wrong.
 */
export const LOCATIONS = [
  { label: "Jakarta Selatan", lat: -6.2615, lng: 106.8106, tz: 7 },
  { label: "Bandung", lat: -6.9175, lng: 107.6191, tz: 7 },
  { label: "Surabaya", lat: -7.2575, lng: 112.7521, tz: 7 },
  { label: "Yogyakarta", lat: -7.7956, lng: 110.3695, tz: 7 },
  { label: "Medan", lat: 3.5952, lng: 98.6722, tz: 7 },
  { label: "Banda Aceh", lat: 5.5483, lng: 95.3238, tz: 7 },
  { label: "Makassar", lat: -5.1477, lng: 119.4327, tz: 8 },
  { label: "Denpasar", lat: -8.6705, lng: 115.2126, tz: 8 },
  { label: "Jayapura", lat: -2.5337, lng: 140.7181, tz: 9 },
] as const;

export const DEFAULT_LOCATION = LOCATIONS[0];
