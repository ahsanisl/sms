import { BILL_DUE_SOON_DAYS, BILL_FREQUENCY_MONTHS, type BillFrequency } from "@/lib/constants";

/**
 * Small, pure date/money helpers shared by the Expenses, Bills, Payroll and
 * Income & Expenses screens (server and client). Dates are ISO "YYYY-MM-DD"
 * strings and months are "YYYY-MM" keys, matching how the rest of the app
 * stores dates (UTC calendar days).
 */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-11-04" → "2026-11". */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function currentMonthKey(): string {
  return monthKeyOf(todayIso());
}

/** "2026-11" → "November 2026". */
export function monthKeyLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-11" → "Nov 26" (chart axes). */
export function monthKeyShortLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Adds whole months to a month key: ("2026-11", -1) → "2026-10". */
export function addMonthsToKey(monthKey: string, months: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last `count` month keys ending with `endKey`, oldest first. */
export function lastMonthKeys(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonthsToKey(endKey, i - count + 1));
}

/** First and last calendar day of a month key. */
export function monthRange(monthKey: string): { from: string; to: string } {
  const [y, m] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${monthKey}-01`, to: `${monthKey}-${String(last).padStart(2, "0")}` };
}

/** Adds months to an ISO date, keeping the day where possible (31 Jan + 1 month → 28/29 Feb). */
export function addMonthsToDate(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const lastDayOfTarget = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  const target = new Date(Date.UTC(y, m - 1 + months, Math.min(d, lastDayOfTarget)));
  return target.toISOString().slice(0, 10);
}

export function nextBillDueDate(currentDueDate: string, frequency: BillFrequency): string {
  return addMonthsToDate(currentDueDate, BILL_FREQUENCY_MONTHS[frequency]);
}

export type BillDueState = "overdue" | "due_soon" | "upcoming";

export function billDueState(nextDueDate: string, today = todayIso()): BillDueState {
  if (nextDueDate < today) return "overdue";
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + BILL_DUE_SOON_DAYS);
  return nextDueDate <= soon.toISOString().slice(0, 10) ? "due_soon" : "upcoming";
}

/** Whole days between two ISO dates (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

const WEEKDAY_CODES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Working days (by weekday code, e.g. ["Mon",...,"Fri"]) between two ISO dates, inclusive. */
export function countWorkingDays(from: string, to: string, workingDays: string[]): number {
  if (to < from) return 0;
  let count = 0;
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    if (workingDays.includes(WEEKDAY_CODES[d.getUTCDay()])) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

/** Gross pay, deductions and net for a payslip — one formula used by payroll creation, edits and the UI preview. */
export function payslipTotals(p: { basicSalary: number; allowances: number; fixedDeductions: number; leaveDeduction: number; bonus: number; otherDeduction: number }) {
  const gross = p.basicSalary + p.allowances + p.bonus;
  const deductions = p.fixedDeductions + p.leaveDeduction + p.otherDeduction;
  return { gross, deductions, net: Math.max(0, gross - deductions) };
}

/** Unpaid-leave deduction: a day's pay is (basic + allowances) ÷ the month's working days. */
export function leaveDeductionFor(basicSalary: number, allowances: number, unpaidDays: number, workingDaysInMonth: number): number {
  if (unpaidDays <= 0 || workingDaysInMonth <= 0) return 0;
  return Math.round(((basicSalary + allowances) / workingDaysInMonth) * Math.min(unpaidDays, workingDaysInMonth));
}
