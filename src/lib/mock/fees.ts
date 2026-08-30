import type { FeeCategory, FeeInvoice, FeePayment, FeeStructureItem, InvoiceStatus, PaymentMethod } from "@/lib/types";
import { intBetween, mulberry32, pick } from "@/lib/mock/names";
import { STUDENTS } from "@/lib/mock/students";
import { CLASSES } from "@/lib/mock/reference-data";
import { SCHOOLS } from "@/lib/mock/schools";

const rand = mulberry32(303);

const FEE_CATEGORY_NAMES = [
  "Tuition Fee",
  "Admission Fee",
  "Examination Fee",
  "Annual Fund",
  "Transport Fee",
  "Library Fee",
  "Sports Fee",
  "Registration Fee",
];

function buildFeeCategories(): FeeCategory[] {
  const categories: FeeCategory[] = [];
  for (const school of SCHOOLS) {
    FEE_CATEGORY_NAMES.forEach((name, i) => {
      categories.push({ id: `${school.id}-fc${i + 1}`, name, schoolId: school.id, status: "active" });
    });
  }
  return categories;
}

// Mutable — see the render-body mirror-sync comment in lib/store/app-data-context.tsx.
export let FEE_CATEGORIES: FeeCategory[] = buildFeeCategories();

export function syncFeeCategories(next: FeeCategory[]) {
  FEE_CATEGORIES = next;
}

const TUITION_BY_GRADE: Record<string, number> = {
  "Grade 1": 8500,
  "Grade 2": 9000,
  "Grade 5": 12500,
  "Grade 8": 15500,
  "O-Level": 27000,
};

export function tuitionForClass(classId: string): number {
  const cls = CLASSES.find((c) => c.id === classId);
  return cls ? TUITION_BY_GRADE[cls.grade] : 10000;
}

function buildFeeStructure(): FeeStructureItem[] {
  const items: FeeStructureItem[] = [];
  let seq = 1;
  for (const cls of CLASSES) {
    const tuition = TUITION_BY_GRADE[cls.grade];
    items.push(
      { id: `fs${seq++}`, campusId: cls.campusId, classId: cls.id, name: "Tuition Fee", amount: tuition, frequency: "monthly" },
      { id: `fs${seq++}`, campusId: cls.campusId, classId: cls.id, name: "Admission Fee", amount: tuition * 2, frequency: "one_time" },
      { id: `fs${seq++}`, campusId: cls.campusId, classId: cls.id, name: "Examination Fee", amount: Math.round(tuition * 0.4), frequency: "quarterly" },
      { id: `fs${seq++}`, campusId: cls.campusId, classId: cls.id, name: "Annual Fund", amount: Math.round(tuition * 0.6), frequency: "annual" },
    );
  }
  return items;
}

export const FEE_STRUCTURE: FeeStructureItem[] = buildFeeStructure();

const MONTHS = [
  { label: "July 2026", issue: "2026-07-01", due: "2026-07-10" },
  { label: "August 2026", issue: "2026-08-01", due: "2026-08-10" },
];

function rollStatus(): { status: InvoiceStatus; paidFraction: number } {
  const r = rand();
  if (r < 0.62) return { status: "paid", paidFraction: 1 };
  if (r < 0.77) return { status: "unpaid", paidFraction: 0 };
  if (r < 0.9) return { status: "overdue", paidFraction: 0 };
  return { status: "partial", paidFraction: 0.5 };
}

function buildInvoicesAndPayments() {
  const invoices: FeeInvoice[] = [];
  const payments: FeePayment[] = [];
  let invSeq = 1;
  let paySeq = 1;

  for (const student of STUDENTS) {
    if (student.status !== "active") continue;
    const tuition = tuitionForClass(student.classId);
    const transport = rand() > 0.6 ? Math.round(tuition * 0.2) : 0;

    MONTHS.forEach((month, monthIdx) => {
      const isCurrentMonth = monthIdx === MONTHS.length - 1;
      const { status, paidFraction } = isCurrentMonth
        ? rollStatus()
        : { status: "paid" as InvoiceStatus, paidFraction: 1 };

      const items = [
        { name: "Tuition Fee", amount: tuition },
        ...(transport ? [{ name: "Transport Fee", amount: transport }] : []),
      ];
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
      const paidAmount = Math.round(totalAmount * paidFraction);

      const invoiceId = `inv${invSeq++}`;
      invoices.push({
        id: invoiceId,
        studentId: student.id,
        invoiceNo: `EDU-INV-${month.issue.slice(0, 7).replace("-", "")}-${String(invSeq).padStart(4, "0")}`,
        month: month.label,
        issueDate: month.issue,
        dueDate: month.due,
        items,
        totalAmount,
        paidAmount,
        status,
      });

      if (paidAmount > 0) {
        payments.push({
          id: `pay${paySeq++}`,
          invoiceId,
          studentId: student.id,
          amount: paidAmount,
          method: pick<PaymentMethod>(["cash", "bank_transfer", "card", "cheque"], rand),
          date: `${month.issue.slice(0, 8)}${String(intBetween(2, 9, rand)).padStart(2, "0")}`,
          receivedBy: pick(["Front Desk", "Accounts Office", "Online Portal"], rand),
        });
      }
    });
  }

  return { invoices, payments };
}

// Mutable — see the render-body mirror-sync comment in
// lib/store/app-data-context.tsx. Recording a payment, applying a discount or
// reversing a payment all dispatch into the store's own invoices/payments
// arrays; without this mirror staying in sync, invoicesForStudent/
// paymentsForInvoice/invoiceById (used on Student Profile, Reports Center,
// etc.) would keep showing pre-edit balances forever.
const seededFees = buildInvoicesAndPayments();
export let FEE_INVOICES: FeeInvoice[] = seededFees.invoices;
export let FEE_PAYMENTS: FeePayment[] = seededFees.payments;

export function syncFeeInvoices(next: FeeInvoice[]) {
  FEE_INVOICES = next;
}

export function syncFeePayments(next: FeePayment[]) {
  FEE_PAYMENTS = next;
}

export function invoicesForStudent(studentId: string) {
  return FEE_INVOICES.filter((i) => i.studentId === studentId);
}

export function paymentsForInvoice(invoiceId: string) {
  return FEE_PAYMENTS.filter((p) => p.invoiceId === invoiceId);
}

export function invoiceById(id: string) {
  return FEE_INVOICES.find((i) => i.id === id);
}
