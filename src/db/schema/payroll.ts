import { boolean, date, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { archivableStatusEnum, paymentMethodEnum, payrollRunStatusEnum, payslipStatusEnum } from "@/db/schema/enums";
import { schools } from "@/db/schema/schools";
import { campuses } from "@/db/schema/campuses";
import { teachers } from "@/db/schema/teachers";
import { users } from "@/db/schema/users";

/**
 * One person on the payroll and their standing monthly pay. Teaching staff
 * link to their teacher record (so unpaid leave can be deducted); other
 * staff (guards, drivers, office staff) are just a name and designation.
 */
export const salaryProfiles = pgTable(
  "salary_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "restrict" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    designation: text("designation").notNull().default(""),
    basicSalary: integer("basic_salary").notNull(),
    /** Fixed monthly extras (house rent, conveyance, ...). */
    allowances: integer("allowances").notNull().default(0),
    /** Fixed monthly deductions (provident fund, tax withheld, loan instalment, ...). */
    deductions: integer("deductions").notNull().default(0),
    bankAccount: text("bank_account").notNull().default(""),
    /** Withhold income tax each month using the school's tax brackets (schools.income_tax_slabs). */
    autoIncomeTax: boolean("auto_income_tax").notNull().default(false),
    status: archivableStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("salary_profiles_school_id_idx").on(table.schoolId)],
);

/**
 * Unpaid leave for anyone on the payroll — mainly non-teaching staff, who
 * don't use Leave Requests. (Teachers' approved "Unpaid Leave" requests are
 * counted too; see services/payroll.service.ts.)
 */
export const staffUnpaidLeave = pgTable(
  "staff_unpaid_leave",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => salaryProfiles.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    note: text("note").notNull().default(""),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staff_unpaid_leave_profile_id_idx").on(table.profileId)],
);

/** One month's payroll for a school. */
export const payrollRuns = pgTable(
  "payroll_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** "YYYY-MM". */
    month: text("month").notNull(),
    status: payrollRunStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    finalizedBy: uuid("finalized_by").references(() => users.id, { onDelete: "set null" }),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("payroll_runs_school_month_idx").on(table.schoolId, table.month)],
);

/**
 * A person's pay for one run. Name, designation, campus and amounts are
 * copied from the salary profile when the run is created, so later profile
 * changes never rewrite a past month.
 */
export const payslips = pgTable(
  "payslips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => payrollRuns.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => salaryProfiles.id, { onDelete: "restrict" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    designation: text("designation").notNull().default(""),
    basicSalary: integer("basic_salary").notNull(),
    allowances: integer("allowances").notNull().default(0),
    fixedDeductions: integer("fixed_deductions").notNull().default(0),
    unpaidLeaveDays: integer("unpaid_leave_days").notNull().default(0),
    leaveDeduction: integer("leave_deduction").notNull().default(0),
    bonus: integer("bonus").notNull().default(0),
    otherDeduction: integer("other_deduction").notNull().default(0),
    /** Income tax withheld this month (calculated from the school's tax brackets when the run was created). */
    incomeTax: integer("income_tax").notNull().default(0),
    netPay: integer("net_pay").notNull(),
    note: text("note").notNull().default(""),
    status: payslipStatusEnum("status").notNull().default("unpaid"),
    paidDate: date("paid_date"),
    method: paymentMethodEnum("method"),
    reference: text("reference"),
    paidBy: uuid("paid_by").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [index("payslips_run_id_idx").on(table.runId), uniqueIndex("payslips_run_profile_idx").on(table.runId, table.profileId)],
);

export type SalaryProfile = typeof salaryProfiles.$inferSelect;
export type NewSalaryProfile = typeof salaryProfiles.$inferInsert;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type StaffUnpaidLeave = typeof staffUnpaidLeave.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type NewPayslip = typeof payslips.$inferInsert;
