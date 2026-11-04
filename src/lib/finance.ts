import { BILL_DUE_SOON_DAYS, BILL_FREQUENCY_MONTHS, type BillFrequency } from "@/lib/constants";
import { todayIso } from "@/lib/dates";

export { todayIso };

/**
 * Small, pure date/money helpers shared by the Expenses, Bills, Payroll and
 * Income & Expenses screens (server and client). Dates are ISO "YYYY-MM-DD"
 * strings and months are "YYYY-MM" keys, matching how the rest of the app
 * stores dates. "Today" is the school's date (lib/dates.ts).
 */


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
export function payslipTotals(p: { basicSalary: number; allowances: number; fixedDeductions: number; leaveDeduction: number; bonus: number; otherDeduction: number; incomeTax?: number }) {
  const gross = p.basicSalary + p.allowances + p.bonus;
  const deductions = p.fixedDeductions + p.leaveDeduction + p.otherDeduction + (p.incomeTax ?? 0);
  return { gross, deductions, net: Math.max(0, gross - deductions) };
}

// -- Income tax --------------------------------------------------------

export interface TaxSlab {
  /** Yearly income from which this bracket's rate applies. */
  from: number;
  ratePercent: number;
}

/**
 * Pakistan's salaried income-tax brackets for tax year 2026 (1 July 2025 –
 * 30 June 2026), as marginal rates. Offered as a starting point only —
 * schools must check them against the current FBR rates; they change with
 * every budget. (The surcharge on incomes above Rs. 10 million isn't included.)
 */
export const PAKISTAN_SALARIED_SLABS_2026: TaxSlab[] = [
  { from: 0, ratePercent: 0 },
  { from: 600_000, ratePercent: 1 },
  { from: 1_200_000, ratePercent: 11 },
  { from: 2_200_000, ratePercent: 23 },
  { from: 3_200_000, ratePercent: 30 },
  { from: 4_100_000, ratePercent: 35 },
];

/** Yearly tax on a yearly income, with marginal brackets. */
export function yearlyIncomeTax(yearlyIncome: number, slabs: TaxSlab[]): number {
  const sorted = [...slabs].sort((a, b) => a.from - b.from);
  let tax = 0;
  sorted.forEach((slab, i) => {
    const upper = sorted[i + 1]?.from ?? Infinity;
    if (yearlyIncome > slab.from) tax += ((Math.min(yearlyIncome, upper) - slab.from) * slab.ratePercent) / 100;
  });
  return Math.round(tax);
}

/**
 * This month's withholding: tax on the regular salary (basic + allowances)
 * over a full year, divided by 12. One-off bonuses aren't annualised — add
 * any tax on them under "Other deductions".
 */
export function monthlyIncomeTax(basicSalary: number, allowances: number, slabs: TaxSlab[] | null | undefined): number {
  if (!slabs?.length) return 0;
  return Math.round(yearlyIncomeTax((basicSalary + allowances) * 12, slabs) / 12);
}

/** Unpaid-leave deduction: a day's pay is (basic + allowances) ÷ the month's working days. */
export function leaveDeductionFor(basicSalary: number, allowances: number, unpaidDays: number, workingDaysInMonth: number): number {
  if (unpaidDays <= 0 || workingDaysInMonth <= 0) return 0;
  return Math.round(((basicSalary + allowances) / workingDaysInMonth) * Math.min(unpaidDays, workingDaysInMonth));
}
