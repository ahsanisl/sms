import "server-only";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "@/db";
import {
  feeCategories,
  feeConcessions,
  feeInvoiceItems,
  feeInvoices,
  feePaymentReversals,
  feePayments,
  feeStructureItems,
  type NewFeeCategory,
  type NewFeeConcession,
  type NewFeeStructureItem,
} from "@/db/schema";

// -- Categories --------------------------------------------------------
export async function listCategories(schoolId: string) {
  return db.select().from(feeCategories).where(eq(feeCategories.schoolId, schoolId));
}
export async function createCategory(schoolId: string, input: Omit<NewFeeCategory, "schoolId">) {
  const [row] = await db.insert(feeCategories).values({ ...input, schoolId }).returning();
  return row;
}
export async function updateCategory(schoolId: string, categoryId: string, input: Partial<NewFeeCategory>) {
  const [row] = await db
    .update(feeCategories)
    .set(input)
    .where(and(eq(feeCategories.id, categoryId), eq(feeCategories.schoolId, schoolId)))
    .returning();
  return row ?? null;
}
export async function archiveCategory(schoolId: string, categoryId: string) {
  await db.update(feeCategories).set({ status: "archived" }).where(and(eq(feeCategories.id, categoryId), eq(feeCategories.schoolId, schoolId)));
}

// -- Fee structure -------------------------------------------------------
export async function listStructureItems(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  return db.select().from(feeStructureItems).where(inArray(feeStructureItems.campusId, campusIds));
}
export async function createStructureItem(campusId: string, input: Omit<NewFeeStructureItem, "campusId">) {
  const [row] = await db.insert(feeStructureItems).values({ ...input, campusId }).returning();
  return row;
}
export async function deleteStructureItem(campusIds: string[], itemId: string) {
  await db.delete(feeStructureItems).where(and(eq(feeStructureItems.id, itemId), inArray(feeStructureItems.campusId, campusIds)));
}

/** Count of invoices whose number already starts with this prefix — used to seed a collision-free starting sequence for a bulk-generate run (see fee.service.ts's generateInvoices). */
export async function countInvoicesWithPrefix(prefix: string) {
  const rows = await db.select({ id: feeInvoices.id }).from(feeInvoices).where(like(feeInvoices.invoiceNo, `${prefix}%`));
  return rows.length;
}

// -- Invoices --------------------------------------------------------
export async function listInvoicesForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return db.select().from(feeInvoices).where(inArray(feeInvoices.studentId, studentIds));
}

export async function getInvoiceWithItems(invoiceId: string) {
  const [invoice] = await db.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
  if (!invoice) return null;
  const items = await db.select().from(feeInvoiceItems).where(eq(feeInvoiceItems.invoiceId, invoiceId));
  return { ...invoice, items };
}

export async function createInvoice(
  studentId: string,
  invoiceNo: string,
  month: string,
  issueDate: string,
  dueDate: string,
  items: { name: string; amount: number; isDiscount?: boolean }[],
) {
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .insert(feeInvoices)
      .values({ studentId, invoiceNo, month, issueDate, dueDate, totalAmount, paidAmount: 0, status: "unpaid" })
      .returning();
    if (items.length > 0) {
      await tx.insert(feeInvoiceItems).values(items.map((item) => ({ ...item, invoiceId: invoice.id })));
    }
    return invoice;
  });
}

// -- Payments (never destructive — see reversals) --------------------------------------------------------
export async function recordPayment(invoiceId: string, studentId: string, amount: number, method: string, date: string, receivedBy: string, reference?: string) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
    if (!invoice) return null;
    const paidAmount = Math.min(invoice.totalAmount, invoice.paidAmount + amount);
    const status = paidAmount >= invoice.totalAmount ? "paid" : paidAmount > 0 ? "partial" : invoice.status;
    await tx.update(feeInvoices).set({ paidAmount, status }).where(eq(feeInvoices.id, invoiceId));
    const [payment] = await tx
      .insert(feePayments)
      .values({ invoiceId, studentId, amount, method: method as never, date, receivedBy, reference })
      .returning();
    return payment;
  });
}

/** Never deletes the original payment — inserts a reversal row and adjusts the invoice, keeping the full history intact (spec §23). */
export async function reversePayment(paymentId: string, amount: number, reason: string, date: string, reversedBy: string) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(feePayments).where(eq(feePayments.id, paymentId)).limit(1);
    if (!payment) return null;
    const [invoice] = await tx.select().from(feeInvoices).where(eq(feeInvoices.id, payment.invoiceId)).limit(1);
    if (!invoice) return null;
    const paidAmount = Math.max(0, invoice.paidAmount - amount);
    const status = paidAmount >= invoice.totalAmount ? "paid" : paidAmount > 0 ? "partial" : "unpaid";
    await tx.update(feeInvoices).set({ paidAmount, status }).where(eq(feeInvoices.id, invoice.id));
    const [reversal] = await tx
      .insert(feePaymentReversals)
      .values({ paymentId, invoiceId: invoice.id, studentId: payment.studentId, amount, reason, date, reversedBy })
      .returning();
    return reversal;
  });
}

export async function listPaymentsForInvoice(invoiceId: string) {
  return db.select().from(feePayments).where(eq(feePayments.invoiceId, invoiceId));
}

export async function listReversalsForInvoice(invoiceId: string) {
  return db.select().from(feePaymentReversals).where(eq(feePaymentReversals.invoiceId, invoiceId));
}

export async function listPaymentsForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return db.select().from(feePayments).where(inArray(feePayments.studentId, studentIds));
}

export async function listReversalsForStudents(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return db.select().from(feePaymentReversals).where(inArray(feePaymentReversals.studentId, studentIds));
}

// -- Concessions --------------------------------------------------------
export async function applyConcession(invoiceId: string, input: Omit<NewFeeConcession, "invoiceId">) {
  return db.transaction(async (tx) => {
    const [invoice] = await tx.select().from(feeInvoices).where(eq(feeInvoices.id, invoiceId)).limit(1);
    if (!invoice) return null;
    const items = await tx.select().from(feeInvoiceItems).where(eq(feeInvoiceItems.invoiceId, invoiceId));
    const subtotal = items.filter((i) => !i.isDiscount).reduce((s, i) => s + i.amount, 0);
    const discountAmount = input.percentage != null ? Math.round((subtotal * input.percentage) / 100) : (input.amount ?? 0);

    const [concession] = await tx.insert(feeConcessions).values({ ...input, invoiceId }).returning();
    await tx.insert(feeInvoiceItems).values({ invoiceId, name: input.label, amount: -discountAmount, isDiscount: true });

    const totalAmount = Math.max(0, invoice.totalAmount - discountAmount);
    const status = invoice.paidAmount >= totalAmount ? "paid" : invoice.paidAmount > 0 ? "partial" : invoice.status;
    await tx.update(feeInvoices).set({ totalAmount, status }).where(eq(feeInvoices.id, invoiceId));
    return concession;
  });
}

export async function listConcessions(studentId: string) {
  return db.select().from(feeConcessions).where(eq(feeConcessions.studentId, studentId));
}
