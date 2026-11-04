import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum, billFrequencyEnum, expenseStatusEnum, paymentMethodEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { users } from "@/db/schema/users";

/** A school's own list of spending categories (Utilities, Rent, Maintenance, ...). New schools start with DEFAULT_EXPENSE_CATEGORIES. */
export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("expense_categories_school_id_idx").on(table.schoolId)],
);

/**
 * A bill the school pays on a schedule (rent, electricity, internet...).
 * Paying it records an ordinary expense linked back here and moves
 * nextDueDate forward by one period. `amount` is the usual amount — the
 * actual expense can differ (e.g. a variable electricity bill).
 */
export const recurringBills = pgTable(
  "recurring_bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** null = shared by the whole school. */
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    payee: text("payee").notNull().default(""),
    amount: integer("amount").notNull(),
    frequency: billFrequencyEnum("frequency").notNull().default("monthly"),
    nextDueDate: date("next_due_date").notNull(),
    notes: text("notes").notNull().default(""),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("recurring_bills_school_id_idx").on(table.schoolId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** null = a school-wide cost not tied to one campus. */
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    billId: uuid("bill_id").references(() => recurringBills.id, { onDelete: "set null" }),
    date: date("date").notNull(),
    amount: integer("amount").notNull(),
    payee: text("payee").notNull().default(""),
    description: text("description").notNull().default(""),
    method: paymentMethodEnum("method").notNull().default("cash"),
    reference: text("reference"),
    status: expenseStatusEnum("status").notNull().default("pending"),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("expenses_school_id_date_idx").on(table.schoolId, table.date), index("expenses_bill_id_idx").on(table.billId)],
);

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type RecurringBill = typeof recurringBills.$inferSelect;
export type NewRecurringBill = typeof recurringBills.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
