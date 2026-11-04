import { z } from "zod";

const money = (label: string) => z.coerce.number().int(`${label}: enter a whole amount in rupees.`).min(0, `${label} can't be negative.`).max(100_000_000);

export const SalaryProfileInputSchema = z.object({
  campusId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().uuid().nullable()),
  teacherId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.string().uuid().nullable()),
  name: z.string().trim().min(1, "Name is required.").max(120),
  designation: z.string().trim().max(80).default(""),
  basicSalary: money("Basic salary").refine((v) => v > 0, "Basic salary must be more than zero."),
  allowances: money("Allowances").default(0),
  deductions: money("Deductions").default(0),
  bankAccount: z.string().trim().max(80).default(""),
  autoIncomeTax: z.boolean().default(false),
});

export const TaxSlabsInputSchema = z
  .array(z.object({ from: z.coerce.number().int().min(0).max(1_000_000_000), ratePercent: z.coerce.number().min(0).max(100) }))
  .max(20)
  .refine((slabs) => slabs.length === 0 || slabs.some((s) => s.from === 0), "The first bracket must start at Rs. 0.")
  .refine((slabs) => new Set(slabs.map((s) => s.from)).size === slabs.length, "Two brackets start at the same amount.");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
export const StaffUnpaidLeaveInputSchema = z
  .object({ profileId: z.string().uuid(), startDate: isoDate, endDate: isoDate, note: z.string().trim().max(200).default("") })
  .refine((d) => d.endDate >= d.startDate, { message: "The last day can't be before the first.", path: ["endDate"] });

export const CreatePayrollRunInputSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Choose a month."),
});

/** Adjustments allowed on a payslip while its run is still a draft. */
export const PayslipAdjustmentInputSchema = z.object({
  unpaidLeaveDays: z.coerce.number().int().min(0).max(31),
  bonus: money("Bonus"),
  otherDeduction: money("Other deductions"),
  note: z.string().trim().max(300).default(""),
});

export const MarkPayslipsPaidInputSchema = z.object({
  payslipIds: z.array(z.string().uuid()).min(1, "Choose at least one payslip."),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
  method: z.enum(["cash", "bank_transfer", "card", "cheque"]),
  reference: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
});
