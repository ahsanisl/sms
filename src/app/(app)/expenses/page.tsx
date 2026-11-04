import * as expenseService from "@/services/expense.service";
import * as campusService from "@/services/campus.service";
import * as userService from "@/services/user.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { addMonthsToKey, currentMonthKey, monthRange } from "@/lib/finance";
import { getViewCampusId } from "@/services/scope";
import { ExpensesClient, type ExpenseRow, type BillRow, type CategoryRow } from "@/app/(app)/expenses/expenses-client";

/** How far back the Expenses list goes; older entries still count in the Income & Expenses report. */
const EXPENSE_LIST_MONTHS = 12;

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const from = monthRange(addMonthsToKey(currentMonthKey(), -(EXPENSE_LIST_MONTHS - 1))).from;

  const [expenses, bills, categories, campuses, users, canApprove, viewCampusId] = await Promise.all([
    expenseService.listExpenses(session, { inView: true }, { from }),
    expenseService.listBills(session, { inView: true }),
    expenseService.listCategories(session),
    campusService.listCampuses(session),
    userService.listUsersBySchool(session),
    can(session, "expensesApprove"),
    getViewCampusId(session),
  ]);
  const receipts = await expenseService.listReceiptsFor(session, expenses.map((e) => e.id));

  const userName = new Map(users.map((u) => [u.id, u.name]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const campusName = new Map(campuses.map((c) => [c.id, c.name]));
  const allowSchoolWide = session.role !== "campus_admin";

  const expenseRows: ExpenseRow[] = await Promise.all(
    expenses.map(async (e) => ({
      id: e.id,
      date: e.date,
      amount: e.amount,
      payee: e.payee,
      description: e.description,
      method: e.method,
      reference: e.reference ?? "",
      status: e.status,
      categoryId: e.categoryId,
      categoryName: categoryName.get(e.categoryId) ?? "—",
      campusId: e.campusId ?? "",
      campusName: e.campusId ? (campusName.get(e.campusId) ?? "—") : "Whole school",
      isBillPayment: !!e.billId,
      submittedByName: e.submittedBy ? (userName.get(e.submittedBy) ?? "Former staff") : "—",
      reviewedByName: e.reviewedBy ? (userName.get(e.reviewedBy) ?? "Former staff") : undefined,
      reviewNote: e.reviewNote ?? undefined,
      canEdit: await expenseService.canEditExpense(session, e),
      receipts: receipts.filter((r) => r.entityId === e.id).map((r) => ({ id: r.id, fileName: r.fileName })),
    })),
  );

  const billRows: BillRow[] = bills.map((b) => ({
    id: b.id,
    name: b.name,
    payee: b.payee,
    amount: b.amount,
    frequency: b.frequency,
    nextDueDate: b.nextDueDate,
    notes: b.notes,
    status: b.status,
    categoryId: b.categoryId,
    categoryName: categoryName.get(b.categoryId) ?? "—",
    campusId: b.campusId ?? "",
    campusName: b.campusId ? (campusName.get(b.campusId) ?? "—") : "Whole school",
  }));

  const categoryRows: CategoryRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    expenseCount: expenses.filter((e) => e.categoryId === c.id).length,
    billCount: bills.filter((b) => b.categoryId === c.id && b.status === "active").length,
  }));

  const tab = params.tab === "bills" || params.tab === "categories" ? params.tab : "expenses";
  return (
    <ExpensesClient
      initialTab={tab}
      expenses={expenseRows}
      bills={billRows}
      categories={categoryRows}
      campuses={campuses.map((c) => ({ id: c.id, name: c.name }))}
      allowSchoolWide={allowSchoolWide}
      canApprove={canApprove}
      scopeLabel={viewCampusId ? (campusName.get(viewCampusId) ?? "This campus") : session.role === "campus_admin" ? (campuses[0]?.name ?? "Your campus") : "All campuses"}
      listMonths={EXPENSE_LIST_MONTHS}
    />
  );
}
