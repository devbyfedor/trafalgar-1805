/**
 * Dates in the scene: days since midnight on 1 January 1805 (ship's time),
 * fractional for the hour. 1805 was not a leap year. Civil days throughout
 * (docs/history-notes.md, "Scene 2", "Dates and conventions"): a log's
 * nautical day has already been turned into the civil one.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Days before the first of each month. */
const BEFORE = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** A day of 1805 (month 1–12, the date, the hour 0–24; noon by default). */
export function day(month: number, date: number, hour = 12): number {
  return BEFORE[month - 1] + date - 1 + hour / 24;
}

/** The calendar date of a day: [month 1–12, date]. */
export function calendar(d: number): [number, number] {
  const whole = Math.floor(d);
  let m = 11;
  while (m > 0 && BEFORE[m] > whole) m--;
  return [m + 1, whole - BEFORE[m] + 1];
}

/** "30 March 1805", as the date line sets it. */
export function formatDay(d: number): string {
  const [month, date] = calendar(d);
  return `${date} ${MONTHS[month - 1]} 1805`;
}

/** "March", for a day. */
export function monthName(d: number): string {
  return MONTHS[calendar(d)[0] - 1];
}
