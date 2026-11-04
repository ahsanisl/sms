import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories, expenses, recurringBills, type NewExpense, type NewRecurringBill } from "@/db/schema";

/**
 * Which campus-tagged rows a caller may see: rows for any of `campusIds`,
 * plus school-wide rows (campus_id null) when `includeSchoolWide` is set.
 * Built by services/expense.service.ts from the session's scope.
 */
export interface CampusFilter {
  campusIds: string[];
  includeSchoolWide: boolean;
}

function campusCondition(column: typeof expenses.campusId | typeof recurringBills.campusId, filter: CampusFilter): SQL | undefined {
  const parts: SQL[] = [];
  if (filter.campusIds.length) parts.push(inArray(column, filter.campusIds));
  if (filter.includeSchoolWide) parts.push(isNull(column));
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : or(...parts);
}

// -- Categories --------------------------------------------------------
export async function listCategories(schoolId: string) {
  return db.select().from(expenseCategories).where(eq(expenseCategories.schoolId, schoolId)).orderBy(asc(expenseCategories.name));
}
export async function getCategory(schoolId: string, categoryId: string) {
  const [row] = await db
    .select()
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}
export async function createCategory(schoolId: string, name: string) {
  const [row] = await db.insert(expenseCategories).values({ schoolId, name }).returning();
  return row;
}
export async function updateCategory(schoolId: string, categoryId: string, input: { name?: string; status?: "active" | "archived" }) {
  const [row] = await db
    .update(expenseCategories)
    .set(input)
    .where(and(eq(expenseCategories.id, categoryId), eq(expenseCategories.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

// -- Expenses --------------------------------------------------------
export async function listExpenses(schoolId: string, filter: CampusFilter, range?: { from?: string; to?: string }) {
  const campus = campusCondition(expenses.campusId, filter);
  if (!campus) return [];
  const conditions = [eq(expenses.schoolId, schoolId), campus];
  if (range?.from) conditions.push(gte(expenses.date, range.from));
  if (range?.to) conditions.push(lte(expenses.date, range.to));
  return db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}

export async function getExpense(schoolId: string, expenseId: string) {
  const [row] = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function createExpense(input: NewExpense) {
  const [row] = await db.insert(expenses).values(input).returning();
  return row;
}

export async function updateExpense(schoolId: string, expenseId: string, input: Partial<NewExpense>) {
  const [row] = await db
    .update(expenses)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(expenses.id, expenseId), eq(expenses.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

export async function deleteExpense(schoolId: string, expenseId: string) {
  await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.schoolId, schoolId)));
}

// -- Recurring bills --------------------------------------------------------
export async function listBills(schoolId: string, filter: CampusFilter) {
  const campus = campusCondition(recurringBills.campusId, filter);
  if (!campus) return [];
  return db
    .select()
    .from(recurringBills)
    .where(and(eq(recurringBills.schoolId, schoolId), campus))
    .orderBy(asc(recurringBills.nextDueDate));
}

export async function getBill(schoolId: string, billId: string) {
  const [row] = await db
    .select()
    .from(recurringBills)
    .where(and(eq(recurringBills.id, billId), eq(recurringBills.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function createBill(input: NewRecurringBill) {
  const [row] = await db.insert(recurringBills).values(input).returning();
  return row;
}

export async function updateBill(schoolId: string, billId: string, input: Partial<NewRecurringBill>) {
  const [row] = await db
    .update(recurringBills)
    .set(input)
    .where(and(eq(recurringBills.id, billId), eq(recurringBills.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

/**
 * Records the expense for one bill payment and moves the bill's due date on
 * by a period, atomically — only if the bill is still due on
 * `expectedDueDate`, so a double-click (or two people paying at once) can't
 * pay the same period twice.
 */
export async function payBill(schoolId: string, billId: string, expectedDueDate: string, nextDueDate: string, expense: NewExpense) {
  return db.transaction(async (tx) => {
    const [advanced] = await tx
      .update(recurringBills)
      .set({ nextDueDate })
      .where(and(eq(recurringBills.id, billId), eq(recurringBills.schoolId, schoolId), eq(recurringBills.nextDueDate, expectedDueDate)))
      .returning();
    if (!advanced) return null;
    const [created] = await tx.insert(expenses).values(expense).returning();
    return created;
  });
}
