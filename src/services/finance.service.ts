import "server-only";
import * as financeRepo from "@/repositories/finance.repository";
import * as expenseRepo from "@/repositories/expenses.repository";
import { can, requirePermission } from "@/lib/authorization";
import { requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { lastMonthKeys, monthRange } from "@/lib/finance";
import { getViewCampusId, listScopeCampusIds, type ListScope } from "@/services/scope";
import * as campusService from "@/services/campus.service";

/**
 * Income & Expenses: fee income against approved expenses and paid salaries,
 * month by month and per campus. Gated by "financeReport" — it shows salary
 * totals and every campus's figures, so it isn't implied by "fees" or
 * "expenses" alone. Scoped like the Expenses list (a campus-limited role sees
 * only its campus; school-wide costs appear when viewing all campuses).
 */
export async function getIncomeExpenseReport(session: AuthSession, endMonth: string, monthCount: number, scope?: ListScope) {
  await requirePermission(session, "financeReport");
  const schoolId = requireSchoolId(session);
  const campusIds = await listScopeCampusIds(session, scope);
  const viewId = scope?.inView ? await getViewCampusId(session) : null;
  const filter = { campusIds, includeSchoolWide: session.role !== "campus_admin" && !viewId };

  const months = lastMonthKeys(endMonth, monthCount);
  const from = monthRange(months[0]).from;
  const to = monthRange(months[months.length - 1]).to;

  const [income, expenses, salaries, salariesOwed, categories, campuses, canSeePayroll] = await Promise.all([
    financeRepo.feeIncome(campusIds, from, to),
    financeRepo.approvedExpenses(schoolId, filter, from, to),
    financeRepo.salariesPaid(schoolId, filter, from, to),
    financeRepo.salariesOwed(schoolId, filter),
    expenseRepo.listCategories(schoolId),
    campusService.listCampusesInView(session),
    can(session, "payroll"),
  ]);

  return {
    months,
    income,
    expenses,
    salaries,
    salariesOwed,
    includeSchoolWide: filter.includeSchoolWide,
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    campuses: campuses.map((c) => ({ id: c.id, name: c.name })),
    links: { payroll: canSeePayroll },
  };
}
