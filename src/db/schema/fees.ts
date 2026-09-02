import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum, concessionTypeEnum, feeFrequencyEnum, invoiceStatusEnum, paymentMethodEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { classes } from "@/db/schema/classes";
import { students } from "@/db/schema/students";

/** A canonical, managed list of fee item names — Fee Structure items pick from these instead of free-typing a name. */
export const feeCategories = pgTable(
  "fee_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: archivableStatusEnum("status").notNull().default("active"),
  },
  (table) => [index("fee_categories_school_id_idx").on(table.schoolId)],
);

export const feeStructureItems = pgTable(
  "fee_structure_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campusId: uuid("campus_id")
      .notNull()
      .references(() => campuses.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: integer("amount").notNull(),
    frequency: feeFrequencyEnum("frequency").notNull(),
  },
  (table) => [index("fee_structure_items_campus_id_idx").on(table.campusId), index("fee_structure_items_class_id_idx").on(table.classId)],
);

export const feeInvoices = pgTable(
  "fee_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    invoiceNo: text("invoice_no").notNull(),
    month: text("month").notNull(), // e.g. "August 2026"
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    totalAmount: integer("total_amount").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    status: invoiceStatusEnum("status").notNull().default("unpaid"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fee_invoices_student_id_idx").on(table.studentId),
    uniqueIndex("fee_invoices_invoice_no_idx").on(table.invoiceNo),
  ],
);

export const feeInvoiceItems = pgTable(
  "fee_invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => feeInvoices.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: integer("amount").notNull(), // negative for discount/concession lines
    isDiscount: boolean("is_discount").notNull().default(false),
  },
  (table) => [index("fee_invoice_items_invoice_id_idx").on(table.invoiceId)],
);

export const feePayments = pgTable(
  "fee_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => feeInvoices.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    method: paymentMethodEnum("method").notNull(),
    date: date("date").notNull(),
    receivedBy: uuid("received_by"),
    reference: text("reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("fee_payments_invoice_id_idx").on(table.invoiceId), index("fee_payments_student_id_idx").on(table.studentId)],
);

/** Payments are never deleted/edited — a correction is a new row here, keeping the ledger auditable (spec §23). */
export const feePaymentReversals = pgTable(
  "fee_payment_reversals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => feePayments.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => feeInvoices.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    date: date("date").notNull(),
    reversedBy: uuid("reversed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("fee_payment_reversals_invoice_id_idx").on(table.invoiceId)],
);

export const feeConcessions = pgTable(
  "fee_concessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id").references(() => feeInvoices.id, { onDelete: "set null" }),
    type: concessionTypeEnum("type").notNull(),
    label: text("label").notNull(),
    amount: integer("amount"),
    percentage: integer("percentage"),
    reason: text("reason").notNull().default(""),
    approvedBy: uuid("approved_by"),
    effectiveDate: date("effective_date"),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("fee_concessions_student_id_idx").on(table.studentId)],
);

export type FeeCategory = typeof feeCategories.$inferSelect;
export type NewFeeCategory = typeof feeCategories.$inferInsert;
export type FeeStructureItem = typeof feeStructureItems.$inferSelect;
export type NewFeeStructureItem = typeof feeStructureItems.$inferInsert;
export type FeeInvoice = typeof feeInvoices.$inferSelect;
export type FeeInvoiceItem = typeof feeInvoiceItems.$inferSelect;
export type FeePayment = typeof feePayments.$inferSelect;
export type FeePaymentReversal = typeof feePaymentReversals.$inferSelect;
export type FeeConcession = typeof feeConcessions.$inferSelect;
export type NewFeeConcession = typeof feeConcessions.$inferInsert;
