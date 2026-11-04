import "server-only";
import * as expenseRepo from "@/repositories/expenses.repository";
import * as attachmentService from "@/services/attachment.service";
import { can, requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { ExpenseCategoryInputSchema, ExpenseInputSchema, PayBillInputSchema, RecurringBillInputSchema, ReviewExpenseInputSchema } from "@/lib/validation/expenses";
import { BILL_FREQUENCY_LABEL } from "@/lib/constants";
import { monthKeyLabel, monthKeyOf, nextBillDueDate } from "@/lib/finance";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, getViewCampusId, listScopeCampusIds, scopedCampusIds, type ListScope } from "@/services/scope";
import type { CampusFilter } from "@/repositories/expenses.repository";
import type { Expense } from "@/db/schema";

export const RECEIPT_MODULE = "expense";

const NOT_YOURS_TO_CHANGE = "Only an approver can change this expense. You can change your own entries until they're approved.";

/**
 * Expenses and recurring bills.
 *
 * Scope: rows carry a campus, or none for a school-wide cost. A Campus Admin
 * (and any custom role based on it) only sees and records its own campus's
 * rows — never school-wide ones. Narrowing the top bar to one campus shows
 * just that campus's rows.
 *
 * Approval: an entry recorded by someone holding "expensesApprove" is
 * approved straight away; anyone else's waits as "pending" until an approver
 * reviews it. Only approved expenses count in totals and reports.
 */
async function campusFilter(session: AuthSession, scope?: ListScope): Promise<CampusFilter> {
  const campusIds = await listScopeCampusIds(session, scope);
  const viewId = scope?.inView ? await getViewCampusId(session) : null;
  return { campusIds, includeSchoolWide: session.role !== "campus_admin" && !viewId };
}

async function assertCampusWritable(session: AuthSession, campusId: string | null) {
  if (campusId === null) {
    if (session.role === "campus_admin") throw new PermissionError("campus");
    return;
  }
  await assertCampusInScope(session, campusId);
}

async function isVisible(session: AuthSession, campusId: string | null) {
  if (campusId === null) return session.role !== "campus_admin";
  return (await scopedCampusIds(session)).includes(campusId);
}

async function activeCategory(schoolId: string, categoryId: string) {
  const category = await expenseRepo.getCategory(schoolId, categoryId);
  if (!category) throw new NotFoundError("Category");
  if (category.status !== "active") throw new Error("That category is archived. Choose another, or restore it first.");
  return category;
}

// -- Categories --------------------------------------------------------
/** Categories are shared by every campus, so only whole-school roles change them. */
async function requireCategoryManager(session: AuthSession) {
  await requirePermission(session, "expenses");
  if (session.role === "campus_admin") throw new Error("Expense categories are shared by every campus, so only whole-school staff can change them.");
}

export async function listCategories(session: AuthSession) {
  await requirePermission(session, "expenses");
  return expenseRepo.listCategories(requireSchoolId(session));
}

async function assertUniqueCategoryName(schoolId: string, name: string, exceptId?: string) {
  const existing = await expenseRepo.listCategories(schoolId);
  if (existing.some((c) => c.id !== exceptId && c.name.toLowerCase() === name.toLowerCase())) throw new Error(`There's already a category called "${name}".`);
}

export async function createCategory(session: AuthSession, input: unknown) {
  await requireCategoryManager(session);
  const schoolId = requireSchoolId(session);
  const { name } = ExpenseCategoryInputSchema.parse(input);
  await assertUniqueCategoryName(schoolId, name);
  const category = await expenseRepo.createCategory(schoolId, name);
  await logAudit(session, "expense_category.created", "ExpenseCategory", category.id, { name });
  return category;
}

export async function renameCategory(session: AuthSession, categoryId: string, input: unknown) {
  await requireCategoryManager(session);
  const schoolId = requireSchoolId(session);
  const { name } = ExpenseCategoryInputSchema.parse(input);
  await assertUniqueCategoryName(schoolId, name, categoryId);
  const updated = await expenseRepo.updateCategory(schoolId, categoryId, { name });
  if (!updated) throw new NotFoundError("Category");
  await logAudit(session, "expense_category.updated", "ExpenseCategory", categoryId, { name });
  return updated;
}

export async function setCategoryArchived(session: AuthSession, categoryId: string, archived: boolean) {
  await requireCategoryManager(session);
  const updated = await expenseRepo.updateCategory(requireSchoolId(session), categoryId, { status: archived ? "archived" : "active" });
  if (!updated) throw new NotFoundError("Category");
  await logAudit(session, archived ? "expense_category.archived" : "expense_category.restored", "ExpenseCategory", categoryId, { name: updated.name });
  return updated;
}

// -- Expenses --------------------------------------------------------
export async function listExpenses(session: AuthSession, scope?: ListScope, range?: { from?: string; to?: string }) {
  await requirePermission(session, "expenses");
  return expenseRepo.listExpenses(requireSchoolId(session), await campusFilter(session, scope), range);
}

export async function getExpense(session: AuthSession, expenseId: string) {
  await requirePermission(session, "expenses");
  const expense = await expenseRepo.getExpense(requireSchoolId(session), expenseId);
  if (!expense || !(await isVisible(session, expense.campusId))) throw new NotFoundError("Expense");
  return expense;
}

/** Approvers can change any expense; anyone else only their own entries that haven't been approved yet. */
export async function canEditExpense(session: AuthSession, expense: Pick<Expense, "status" | "submittedBy">) {
  if (await can(session, "expensesApprove")) return true;
  return expense.submittedBy === session.userId && expense.status !== "approved";
}

async function approvalFields(session: AuthSession) {
  return (await can(session, "expensesApprove"))
    ? { status: "approved" as const, reviewedBy: session.userId, reviewedAt: new Date(), reviewNote: null }
    : { status: "pending" as const, reviewedBy: null, reviewedAt: null, reviewNote: null };
}

export async function createExpense(session: AuthSession, input: unknown) {
  await requirePermission(session, "expenses");
  const schoolId = requireSchoolId(session);
  const data = ExpenseInputSchema.parse(input);
  await assertCampusWritable(session, data.campusId);
  await activeCategory(schoolId, data.categoryId);
  const expense = await expenseRepo.createExpense({ ...data, schoolId, submittedBy: session.userId, ...(await approvalFields(session)) });
  await logAudit(session, "expense.created", "Expense", expense.id, { amount: expense.amount, status: expense.status });
  return expense;
}

export async function updateExpense(session: AuthSession, expenseId: string, input: unknown) {
  const existing = await getExpense(session, expenseId);
  if (!(await canEditExpense(session, existing))) throw new Error(NOT_YOURS_TO_CHANGE);
  const schoolId = requireSchoolId(session);
  const data = ExpenseInputSchema.parse(input);
  await assertCampusWritable(session, data.campusId);
  if (data.categoryId !== existing.categoryId) await activeCategory(schoolId, data.categoryId);
  const isApprover = await can(session, "expensesApprove");
  // A non-approver editing their own rejected entry resubmits it for approval.
  const resubmit = !isApprover && existing.status === "rejected" ? { status: "pending" as const, reviewedBy: null, reviewedAt: null, reviewNote: null } : {};
  const updated = await expenseRepo.updateExpense(schoolId, expenseId, { ...data, ...resubmit });
  if (!updated) throw new NotFoundError("Expense");
  await logAudit(session, "expense.updated", "Expense", expenseId, { amount: updated.amount, previousAmount: existing.amount });
  return updated;
}

export async function reviewExpense(session: AuthSession, expenseId: string, input: unknown) {
  await requirePermission(session, "expensesApprove");
  const existing = await getExpense(session, expenseId);
  if (existing.status !== "pending") throw new Error("This expense has already been reviewed.");
  const data = ReviewExpenseInputSchema.parse(input);
  const updated = await expenseRepo.updateExpense(requireSchoolId(session), expenseId, {
    status: data.status,
    reviewedBy: session.userId,
    reviewedAt: new Date(),
    reviewNote: data.reviewNote || null,
  });
  await logAudit(session, data.status === "approved" ? "expense.approved" : "expense.rejected", "Expense", expenseId, { amount: existing.amount, note: data.reviewNote });
  return updated;
}

export async function deleteExpense(session: AuthSession, expenseId: string) {
  const existing = await getExpense(session, expenseId);
  if (!(await canEditExpense(session, existing))) throw new Error(NOT_YOURS_TO_CHANGE);
  const receipts = await attachmentService.listAttachments(session, RECEIPT_MODULE, expenseId);
  for (const receipt of receipts) await attachmentService.deleteAttachment(session, receipt.id);
  await expenseRepo.deleteExpense(requireSchoolId(session), expenseId);
  await logAudit(session, "expense.deleted", "Expense", expenseId, { amount: existing.amount, date: existing.date, payee: existing.payee });
}

// -- Receipts --------------------------------------------------------
export async function addReceipt(session: AuthSession, expenseId: string, file: File) {
  const expense = await getExpense(session, expenseId);
  if (!(await canEditExpense(session, expense))) throw new Error(NOT_YOURS_TO_CHANGE);
  return attachmentService.saveAttachment(session, RECEIPT_MODULE, expenseId, file);
}

export async function removeReceipt(session: AuthSession, attachmentId: string) {
  const { attachment } = await attachmentService.getAttachmentForDownload(session, attachmentId);
  if (attachment.module !== RECEIPT_MODULE) throw new NotFoundError("File");
  const expense = await getExpense(session, attachment.entityId);
  if (!(await canEditExpense(session, expense))) throw new Error(NOT_YOURS_TO_CHANGE);
  await attachmentService.deleteAttachment(session, attachmentId);
}

/** Receipts for a list of expenses the caller already fetched through listExpenses (so already scoped). */
export async function listReceiptsFor(session: AuthSession, expenseIds: string[]) {
  await requirePermission(session, "expenses");
  return attachmentService.listAttachmentsForEntities(session, RECEIPT_MODULE, expenseIds);
}

// -- Recurring bills --------------------------------------------------------
export async function listBills(session: AuthSession, scope?: ListScope) {
  await requirePermission(session, "expenses");
  return expenseRepo.listBills(requireSchoolId(session), await campusFilter(session, scope));
}

async function getBill(session: AuthSession, billId: string) {
  await requirePermission(session, "expenses");
  const bill = await expenseRepo.getBill(requireSchoolId(session), billId);
  if (!bill || !(await isVisible(session, bill.campusId))) throw new NotFoundError("Bill");
  return bill;
}

export async function createBill(session: AuthSession, input: unknown) {
  await requirePermission(session, "expenses");
  const schoolId = requireSchoolId(session);
  const data = RecurringBillInputSchema.parse(input);
  await assertCampusWritable(session, data.campusId);
  await activeCategory(schoolId, data.categoryId);
  const bill = await expenseRepo.createBill({ ...data, schoolId });
  await logAudit(session, "bill.created", "RecurringBill", bill.id, { name: bill.name, amount: bill.amount });
  return bill;
}

export async function updateBill(session: AuthSession, billId: string, input: unknown) {
  const existing = await getBill(session, billId);
  const schoolId = requireSchoolId(session);
  const data = RecurringBillInputSchema.parse(input);
  await assertCampusWritable(session, data.campusId);
  if (data.categoryId !== existing.categoryId) await activeCategory(schoolId, data.categoryId);
  const updated = await expenseRepo.updateBill(schoolId, billId, data);
  await logAudit(session, "bill.updated", "RecurringBill", billId, { name: data.name, amount: data.amount });
  return updated;
}

export async function setBillArchived(session: AuthSession, billId: string, archived: boolean) {
  const existing = await getBill(session, billId);
  await expenseRepo.updateBill(requireSchoolId(session), billId, { status: archived ? "archived" : "active" });
  await logAudit(session, archived ? "bill.archived" : "bill.restored", "RecurringBill", billId, { name: existing.name });
}

/** Records this period's payment as an expense (same approval rule as any expense) and moves the bill to its next due date. */
export async function payBill(session: AuthSession, billId: string, input: unknown) {
  const bill = await getBill(session, billId);
  if (bill.status !== "active") throw new Error("This bill is archived. Restore it before recording a payment.");
  const data = PayBillInputSchema.parse(input);
  const schoolId = requireSchoolId(session);
  const period = bill.frequency === "monthly" ? monthKeyLabel(monthKeyOf(bill.nextDueDate)) : `${BILL_FREQUENCY_LABEL[bill.frequency].toLowerCase()}, due ${bill.nextDueDate}`;
  const expense = await expenseRepo.payBill(schoolId, billId, bill.nextDueDate, nextBillDueDate(bill.nextDueDate, bill.frequency), {
    schoolId,
    campusId: bill.campusId,
    categoryId: bill.categoryId,
    billId: bill.id,
    date: data.date,
    amount: data.amount,
    payee: bill.payee,
    description: data.description || `${bill.name} — ${period}`,
    method: data.method,
    reference: data.reference,
    submittedBy: session.userId,
    ...(await approvalFields(session)),
  });
  if (!expense) throw new Error("This bill was just paid by someone else. Refresh to see its new due date.");
  await logAudit(session, "bill.paid", "RecurringBill", billId, { name: bill.name, amount: data.amount, expenseId: expense.id, dueDate: bill.nextDueDate });
  return expense;
}
