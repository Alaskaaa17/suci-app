/**
 * Calendar-day arithmetic on "YYYY-MM-DD" strings.
 *
 * Everything in this app is reasoned about in whole local days — "hari ke-4",
 * "15 hari", "60 hari". Using Date objects with time components invites
 * off-by-one errors across DST boundaries and timezones, so days are strings
 * and arithmetic goes through UTC noon, which no timezone shift can push over
 * a date boundary.
 */

export type IsoDate = string;

const DAY_MS = 86_400_000;

export function toIso(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIso(now);
}

/** Parses an ISO day to a UTC-noon timestamp. */
function stamp(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 12, 0, 0);
}

function fromStamp(ms: number): IsoDate {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: IsoDate, n: number): IsoDate {
  return fromStamp(stamp(iso) + n * DAY_MS);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((stamp(b) - stamp(a)) / DAY_MS);
}

/** Inclusive day count: the same date on both sides is 1 day, not 0. */
export function inclusiveDays(from: IsoDate, to: IsoDate): number {
  return daysBetween(from, to) + 1;
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b;
}

export function isAfter(a: IsoDate, b: IsoDate): boolean {
  return a > b;
}

export function clampIso(v: IsoDate, min: IsoDate, max: IsoDate): IsoDate {
  return v < min ? min : v > max ? max : v;
}

/** Every day from `from` to `to`, inclusive. */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function toDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* -------------------------------------------------------------------------
   Indonesian formatting. The app is monolingual, so these live here rather
   than behind an i18n layer that has nothing else to do.
   ------------------------------------------------------------------------- */

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Sunday-first, matching JS getDay(). */
const WEEKDAYS = [
  "Ahad",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/** Monday-first column headers, as the calendar screen lays them out. */
export const WEEKDAY_HEADERS = [
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
  "Ahd",
];

/** "Selasa, 15 September 2026" */
export function formatLong(iso: IsoDate): string {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Selasa, 15 September" */
export function formatDayMonth(iso: IsoDate): string {
  const d = toDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "12 Sep" */
export function formatShort(iso: IsoDate): string {
  const d = toDate(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "September 2026" */
export function formatMonthYear(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** "2 Januari 2027" */
export function formatMedium(iso: IsoDate): string {
  const d = toDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Monday-first grid for a month: leading blanks, then every day, padded to
 * whole weeks. Blanks are null so the calendar can render an empty cell.
 */
export function monthGrid(year: number, month: number): (IsoDate | null)[] {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-first; shift so Monday is column 0.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (IsoDate | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** "2j 14m" — the countdown format used on the worship screen. */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}
