import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
/** "" from a form's "Whole school" option → null. */
const optionalCampusId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid().nullable());

export const ExpenseCategoryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(60, "Keep the name under 60 characters."),
});

export const ExpenseInputSchema = z.object({
  campusId: optionalCampusId,
  categoryId: z.string().uuid("Choose a category."),
  date: isoDate,
  amount: z.coerce.number().int("Enter a whole amount in rupees.").positive("Amount must be more than zero.").max(1_000_000_000),
  payee: z.string().trim().max(120).default(""),
  description: z.string().trim().max(500).default(""),
  method: z.enum(["cash", "bank_transfer", "card", "cheque"]),
  reference: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
});

export const ReviewExpenseInputSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().max(500).optional(),
});

export const RecurringBillInputSchema = z.object({
  campusId: optionalCampusId,
  categoryId: z.string().uuid("Choose a category."),
  name: z.string().trim().min(1, "Give the bill a name.").max(120),
  payee: z.string().trim().max(120).default(""),
  amount: z.coerce.number().int("Enter a whole amount in rupees.").positive("Amount must be more than zero.").max(1_000_000_000),
  frequency: z.enum(["monthly", "quarterly", "annual"]),
  nextDueDate: isoDate,
  notes: z.string().trim().max(500).default(""),
});

/** Paying a bill = recording an expense for it; the amount may differ from the bill's usual amount. */
export const PayBillInputSchema = z.object({
  date: isoDate,
  amount: z.coerce.number().int("Enter a whole amount in rupees.").positive("Amount must be more than zero.").max(1_000_000_000),
  method: z.enum(["cash", "bank_transfer", "card", "cheque"]),
  reference: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  description: z.string().trim().max(500).default(""),
});
