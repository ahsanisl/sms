import { z } from "zod";

export const FeeCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
});

export const FeeStructureItemInputSchema = z.object({
  campusId: z.string().uuid(),
  classId: z.string().uuid(),
  name: z.string().trim().min(1),
  amount: z.coerce.number().int().nonnegative(),
  frequency: z.enum(["monthly", "quarterly", "annual", "one_time"]),
});

export const RecordPaymentInputSchema = z.object({
  invoiceId: z.string().uuid(),
  studentId: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  method: z.enum(["cash", "bank_transfer", "card", "cheque"]),
  date: z.string().min(1),
  reference: z.string().optional(),
});

export const ReversePaymentInputSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1, "A reason is required."),
  date: z.string().min(1),
});

export const GenerateInvoicesInputSchema = z.object({
  monthLabel: z.string().trim().min(1, "Give this invoice run a month label."),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  campusId: z.string().uuid().optional(),
});

export const ApplyConcessionInputSchema = z.object({
  invoiceId: z.string().uuid(),
  studentId: z.string().uuid(),
  type: z.enum(["sibling_discount", "staff_discount", "scholarship", "financial_aid", "other"]),
  label: z.string().trim().min(1),
  amount: z.coerce.number().int().nonnegative().optional(),
  percentage: z.coerce.number().min(0).max(100).optional(),
  reason: z.string().trim().default(""),
  effectiveDate: z.string().optional(),
});
