/**
 * "Today" in the school's time zone — not the server's (often UTC) or a
 * stray browser setting. Without this, between midnight and 5 a.m. in
 * Pakistan, UTC is still on the previous day, so default dates, "today's
 * attendance" and "this month" were a day behind.
 *
 * Set NEXT_PUBLIC_SCHOOL_TIME_ZONE to an IANA zone (e.g. "Asia/Dubai") for
 * schools elsewhere; it must be NEXT_PUBLIC_ so server and browser agree.
 * Works on both server and client.
 *
 * Dates are ISO "YYYY-MM-DD" strings, as stored in the database.
 */
export const SCHOOL_TIME_ZONE = process.env.NEXT_PUBLIC_SCHOOL_TIME_ZONE || "Asia/Karachi";

const isoFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** The calendar date of an instant, in the school's time zone. */
export function toSchoolDateIso(instant: Date): string {
  return isoFormatter.format(instant); // en-CA formats as YYYY-MM-DD
}

export function todayIso(): string {
  return toSchoolDateIso(new Date());
}

/** Adds (or with a negative number, subtracts) calendar days. */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysAgoIso(days: number): string {
  return addDaysIso(todayIso(), -days);
}

/** "Mon" … "Sun" for a date (matches the timetable's day codes). */
export function weekdayCode(isoDate: string): "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" {
  return (["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const)[new Date(`${isoDate}T00:00:00Z`).getUTCDay()];
}

/** e.g. "November 2026" — the month label fee invoices use. */
export function monthLabelOf(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function currentMonthLabel(): string {
  return monthLabelOf(todayIso());
}
