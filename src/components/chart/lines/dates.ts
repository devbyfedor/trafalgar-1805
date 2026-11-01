/**
 * Dates on the chart's tracks: a day is counted from the start of
 * 1 January 1805 (civil days, midnight to midnight, as the history notes
 * give them), fractional for the hour, so noon on 1 June is 151.5. 1805 was
 * not a leap year. Plain functions with no imports, so a Node script can
 * check the lettering they make against the fonts (scripts/check-lettering.ts).
 */

export const MONTHS = [
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

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Days before the first of each month. */
const MONTH_START = MONTH_DAYS.map((_, i) =>
  MONTH_DAYS.slice(0, i).reduce((a, b) => a + b, 0),
);

/**
 * The day of a date in 1805 (month 1–12, day of the month) at an hour of
 * ship's time (default noon, when the day's position was taken).
 */
export function dayOf(month: number, date: number, hour = 12): number {
  return MONTH_START[month - 1] + date - 1 + hour / 24;
}

/** The month (1–12) and day of the month of a day. */
export function dateOf(day: number): { month: number; date: number } {
  const whole = Math.floor(day);
  let month = 11;
  while (month > 0 && MONTH_START[month] > whole) month--;
  return { month: month + 1, date: whole - MONTH_START[month] + 1 };
}

/** The day of the month alone, as the track's daily marks give it: "12". */
export function dayNumeral(day: number): string {
  return String(dateOf(day).date);
}

/** The day and the month: "1 June". */
export function dayAndMonth(day: number): string {
  const { month, date } = dateOf(day);
  return `${date} ${MONTHS[month - 1]}`;
}

/** Every character the track's own dates can use (digits, months, a dash). */
export const DATE_CHARACTERS = `0123456789 –${MONTHS.join("")}`;
