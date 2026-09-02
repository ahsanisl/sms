import "server-only";
import * as feeRepo from "@/repositories/fees.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import {
  ApplyConcessionInputSchema,
  FeeCategoryInputSchema,
  FeeStructureItemInputSchema,
  GenerateInvoicesInputSchema,
  RecordPaymentInputSchema,
  ReversePaymentInputSchema,
} from "@/lib/validation/fees";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

/**
 * A parent's scope is their own children, not their campus (a parent has no
 * campusId-based scoping at all) — everyone else is scoped the normal
 * campus-membership way. Used by the single-record read paths below (invoice
 * view, its payments/reversals) which /lib/permissions.ts's
 * ALWAYS_ALLOWED_PREFIXES deliberately leaves un-gated by any permission
 * module so the Parent portal can link straight into them; this function is
 * the actual access boundary for those routes; see spec's IDOR-prevention
 * requirement — a parent guessing another family's invoice id must 404, not
 * see it just because it's in the same school.
 */
async function assertStudentInScope(session: AuthSession, studentId: string) {
  if (session.role === "parent") {
    const children = await userRepo.listChildrenForParent(session.userId);
    if (!children.some((c) => c.studentId === studentId)) throw new NotFoundError("Student");
    return;
  }
  const campusIds = await scopedCampusIds(session);
  const student = await studentRepo.getStudent(campusIds, studentId);
  if (!student) throw new NotFoundError("Student");
  return student;
}

export async function listCategories(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return feeRepo.listCategories(schoolId);
}

export async function createCategory(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesStructure");
  const schoolId = requireSchoolId(session);
  const data = FeeCategoryInputSchema.parse(input);
  const category = await feeRepo.createCategory(schoolId, { ...data, status: "active" });
  await logAudit(session, "fee_category.created", "FeeCategory", category.id);
  return category;
}

export async function updateCategory(session: AuthSession, categoryId: string, input: unknown) {
  await requirePermission(session, "feesStructure");
  const schoolId = requireSchoolId(session);
  const data = FeeCategoryInputSchema.parse(input);
  const updated = await feeRepo.updateCategory(schoolId, categoryId, data);
  if (!updated) throw new NotFoundError("Fee category");
  await logAudit(session, "fee_category.updated", "FeeCategory", categoryId);
  return updated;
}

export async function archiveCategory(session: AuthSession, categoryId: string) {
  await requirePermission(session, "feesStructure");
  const schoolId = requireSchoolId(session);
  await feeRepo.archiveCategory(schoolId, categoryId);
  await logAudit(session, "fee_category.archived", "FeeCategory", categoryId);
}

export async function listStructureItems(session: AuthSession) {
  await requirePermission(session, "feesStructure");
  const campusIds = await scopedCampusIds(session);
  return feeRepo.listStructureItems(campusIds);
}

export async function createStructureItem(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesStructure");
  const data = FeeStructureItemInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, ...rest } = data;
  const item = await feeRepo.createStructureItem(campusId, rest);
  await logAudit(session, "fee_structure_item.created", "FeeStructureItem", item.id);
  return item;
}

// getInvoice/listPaymentsForInvoice/listReversalsForInvoice deliberately have
// no requirePermission("fees") call — /fees/invoices/[id] is one of
// lib/permissions.ts's ALWAYS_ALLOWED_PREFIXES (a single-record, read-mostly
// view both admin pages and the Parent portal link into), so ownership
// (assertStudentInScope, parent-aware above) is the real boundary here, not
// a role's blanket "fees" module flag.
export async function getInvoice(session: AuthSession, invoiceId: string) {
  const invoice = await feeRepo.getInvoiceWithItems(invoiceId);
  if (!invoice) throw new NotFoundError("Invoice");
  await assertStudentInScope(session, invoice.studentId);
  return invoice;
}

export async function listPaymentsForInvoice(session: AuthSession, invoiceId: string) {
  const invoice = await feeRepo.getInvoiceWithItems(invoiceId);
  if (!invoice) throw new NotFoundError("Invoice");
  await assertStudentInScope(session, invoice.studentId);
  return feeRepo.listPaymentsForInvoice(invoiceId);
}

export async function listReversalsForInvoice(session: AuthSession, invoiceId: string) {
  const invoice = await feeRepo.getInvoiceWithItems(invoiceId);
  if (!invoice) throw new NotFoundError("Invoice");
  await assertStudentInScope(session, invoice.studentId);
  return feeRepo.listReversalsForInvoice(invoiceId);
}

/** Trusts studentIds as already scoped by the caller (sourced from a scoped studentService/studentRepo call in the same request) — mirrors attendanceService.listByStudent's precedent. */
export async function listPaymentsForStudents(session: AuthSession, studentIds: string[]) {
  await requirePermission(session, "fees");
  return feeRepo.listPaymentsForStudents(studentIds);
}

export async function listReversalsForStudents(session: AuthSession, studentIds: string[]) {
  await requirePermission(session, "fees");
  return feeRepo.listReversalsForStudents(studentIds);
}

/** No blanket "fees" gate — ownership (assertStudentInScope) is the boundary, same reasoning as getInvoice above. */
export async function listInvoicesForStudent(session: AuthSession, studentId: string) {
  await assertStudentInScope(session, studentId);
  return feeRepo.listInvoicesForStudents([studentId]);
}

/**
 * Bulk read trusting caller-supplied studentIds — used internally by the
 * admin Collect/Generate/Reports flows (whose studentIds already came from a
 * permission-gated studentService/campus-scoped call in the same request),
 * and by the Parent portal (whose studentIds must come only from
 * parentChildren, never a client-supplied list — see spec's IDOR note).
 * Never call this with an untrusted/client-supplied id list.
 */
export async function listInvoicesForStudents(session: AuthSession, studentIds: string[]) {
  void session;
  return feeRepo.listInvoicesForStudents(studentIds);
}

/** Ownership-scoped single-student payment/reversal history — backs the Student Ledger, which a parent can legitimately reach for their own child (no blanket "fees" gate, same reasoning as listInvoicesForStudent above). */
export async function listPaymentsForStudent(session: AuthSession, studentId: string) {
  await assertStudentInScope(session, studentId);
  return feeRepo.listPaymentsForStudents([studentId]);
}

export async function listReversalsForStudent(session: AuthSession, studentId: string) {
  await assertStudentInScope(session, studentId);
  return feeRepo.listReversalsForStudents([studentId]);
}

export async function recordPayment(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesCollect");
  const data = RecordPaymentInputSchema.parse(input);
  await assertStudentInScope(session, data.studentId);
  const payment = await feeRepo.recordPayment(data.invoiceId, data.studentId, data.amount, data.method, data.date, session.userId, data.reference);
  if (!payment) throw new NotFoundError("Invoice");
  await logAudit(session, "payment.recorded", "FeePayment", payment.id, { amount: data.amount });
  return payment;
}

export async function reversePayment(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesCollect");
  const data = ReversePaymentInputSchema.parse(input);
  const reversal = await feeRepo.reversePayment(data.paymentId, data.amount, data.reason, data.date, session.userId);
  if (!reversal) throw new NotFoundError("Payment");
  await assertStudentInScope(session, reversal.studentId);
  await logAudit(session, "payment.reversed", "FeePaymentReversal", reversal.id, { amount: data.amount, reason: data.reason });
  return reversal;
}

export async function applyConcession(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesCollect");
  const data = ApplyConcessionInputSchema.parse(input);
  await assertStudentInScope(session, data.studentId);
  const { invoiceId, ...rest } = data;
  const concession = await feeRepo.applyConcession(invoiceId, { ...rest, approvedBy: session.userId, status: "active" });
  if (!concession) throw new NotFoundError("Invoice");
  await logAudit(session, "concession.applied", "FeeConcession", concession.id);
  return concession;
}

/**
 * Bulk-creates this month's invoices for every active, in-scope student who
 * doesn't already have one for `monthLabel` and whose class has at least one
 * monthly fee structure item — mirrors the Generate Invoices UI's preview
 * logic, re-validated server-side rather than trusting the client's preview.
 */
export async function generateInvoices(session: AuthSession, input: unknown) {
  await requirePermission(session, "feesStructure");
  const data = GenerateInvoicesInputSchema.parse(input);
  if (data.campusId) await assertCampusInScope(session, data.campusId);
  const campusIds = data.campusId ? [data.campusId] : await scopedCampusIds(session);

  const [allStudents, structureItems] = await Promise.all([studentRepo.listStudents(campusIds), feeRepo.listStructureItems(campusIds)]);
  const activeStudents = allStudents.filter((s) => s.status === "active");
  const existingInvoices = await feeRepo.listInvoicesForStudents(activeStudents.map((s) => s.id));
  const alreadyInvoiced = new Set(existingInvoices.filter((i) => i.month === data.monthLabel).map((i) => i.studentId));

  const monthKey = data.issueDate.replace(/-/g, "").slice(0, 6);
  const prefix = `EDU-INV-${monthKey}-`;
  // Seeds the sequence from however many invoices already carry this prefix, so a
  // second generate run for the same month/issue-date doesn't restart at 0001 and
  // collide with the unique invoice_no index — not fully race-safe under
  // concurrent runs, but this is an occasional admin-triggered batch action, not
  // a high-concurrency path.
  let seq = await feeRepo.countInvoicesWithPrefix(prefix);

  const created = [];
  for (const s of activeStudents) {
    if (alreadyInvoiced.has(s.id)) continue;
    const items = structureItems
      .filter((f) => f.campusId === s.campusId && f.classId === s.classId && f.frequency === "monthly")
      .map((f) => ({ name: f.name, amount: f.amount }));
    if (items.length === 0) continue;
    seq += 1;
    const invoiceNo = `${prefix}${String(seq).padStart(4, "0")}`;
    const invoice = await feeRepo.createInvoice(s.id, invoiceNo, data.monthLabel, data.issueDate, data.dueDate, items);
    created.push(invoice);
  }

  await logAudit(session, "invoices.generated", "FeeInvoice", undefined, { count: created.length, month: data.monthLabel });
  return created;
}
