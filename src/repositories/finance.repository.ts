import "server-only";
import { and, eq, gte, inArray, isNull, lte, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses, feePaymentReversals, feePayments, payrollRuns, payslips, students } from "@/db/schema";
import type { CampusFilter } from "@/repositories/expenses.repository";

/**
 * Month-by-campus totals for the Income & Expenses report, summed in the
 * database. Cash basis: fee income counts when it's received (payments, less
 * reversals, by their own dates), expenses when approved and dated in the
 * month, salaries when a payslip is marked paid.
 */

const monthOf = (column: AnyColumn) => sql<string>`to_char(${column}, 'YYYY-MM')`;
const total = (column: AnyColumn) => sql<number>`coalesce(sum(${column}), 0)::bigint`;

function campusCondition(column: AnyColumn, filter: CampusFilter): SQL | undefined {
  const parts: SQL[] = [];
  if (filter.campusIds.length) parts.push(inArray(column, filter.campusIds));
  if (filter.includeSchoolWide) parts.push(isNull(column));
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : or(...parts);
}

export interface MonthCampusTotal {
  month: string;
  campusId: string | null;
  amount: number;
}

/** Fee payments received, by month and the student's campus. Students always belong to a campus, so there is no school-wide income. */
export async function feeIncome(campusIds: string[], from: string, to: string): Promise<MonthCampusTotal[]> {
  if (campusIds.length === 0) return [];
  const [paid, reversed] = await Promise.all([
    db
      .select({ month: monthOf(feePayments.date), campusId: students.campusId, amount: total(feePayments.amount) })
      .from(feePayments)
      .innerJoin(students, eq(students.id, feePayments.studentId))
      .where(and(inArray(students.campusId, campusIds), gte(feePayments.date, from), lte(feePayments.date, to)))
      .groupBy(monthOf(feePayments.date), students.campusId),
    db
      .select({ month: monthOf(feePaymentReversals.date), campusId: students.campusId, amount: total(feePaymentReversals.amount) })
      .from(feePaymentReversals)
      .innerJoin(students, eq(students.id, feePaymentReversals.studentId))
      .where(and(inArray(students.campusId, campusIds), gte(feePaymentReversals.date, from), lte(feePaymentReversals.date, to)))
      .groupBy(monthOf(feePaymentReversals.date), students.campusId),
  ]);
  return [
    ...paid.map((r) => ({ month: r.month, campusId: r.campusId, amount: Number(r.amount) })),
    ...reversed.map((r) => ({ month: r.month, campusId: r.campusId, amount: -Number(r.amount) })),
  ];
}

/** Approved expenses by month, campus (null = school-wide) and category. */
export async function approvedExpenses(schoolId: string, filter: CampusFilter, from: string, to: string) {
  const campus = campusCondition(expenses.campusId, filter);
  if (!campus) return [];
  const rows = await db
    .select({ month: monthOf(expenses.date), campusId: expenses.campusId, categoryId: expenses.categoryId, amount: total(expenses.amount) })
    .from(expenses)
    .where(and(eq(expenses.schoolId, schoolId), eq(expenses.status, "approved"), campus, gte(expenses.date, from), lte(expenses.date, to)))
    .groupBy(monthOf(expenses.date), expenses.campusId, expenses.categoryId);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** Salaries paid, by the month they were paid in and the campus they're booked to. */
export async function salariesPaid(schoolId: string, filter: CampusFilter, from: string, to: string): Promise<MonthCampusTotal[]> {
  const campus = campusCondition(payslips.campusId, filter);
  if (!campus) return [];
  const rows = await db
    .select({ month: monthOf(payslips.paidDate), campusId: payslips.campusId, amount: total(payslips.netPay) })
    .from(payslips)
    .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.runId))
    .where(and(eq(payrollRuns.schoolId, schoolId), eq(payslips.status, "paid"), campus, gte(payslips.paidDate, from), lte(payslips.paidDate, to)))
    .groupBy(monthOf(payslips.paidDate), payslips.campusId);
  return rows.map((r) => ({ ...r, amount: Number(r.amount) }));
}

/** Finalized salaries not yet paid, per run month — shown as a reminder beside the totals. */
export async function salariesOwed(schoolId: string, filter: CampusFilter) {
  const campus = campusCondition(payslips.campusId, filter);
  if (!campus) return [];
  const rows = await db
    .select({ month: payrollRuns.month, amount: total(payslips.netPay), count: sql<number>`count(*)::int` })
    .from(payslips)
    .innerJoin(payrollRuns, eq(payrollRuns.id, payslips.runId))
    .where(and(eq(payrollRuns.schoolId, schoolId), eq(payrollRuns.status, "finalized"), eq(payslips.status, "unpaid"), campus))
    .groupBy(payrollRuns.month);
  return rows.map((r) => ({ month: r.month, amount: Number(r.amount), count: r.count }));
}
