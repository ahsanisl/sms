import * as feeService from "@/services/fee.service";
import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as schoolService from "@/services/school.service";
import * as userService from "@/services/user.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { InvoiceDetailClient } from "@/app/(app)/fees/invoices/[id]/invoice-detail-client";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let invoice;
  try {
    invoice = await feeService.getInvoice(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="receipt_long" title="Invoice not found" description="It may have been removed, or you don't have access to it." />
          <Link href="/fees" className="text-label-md text-secondary hover:underline">
            Back to Fees
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [student, classes, school, payments, reversals, users, canManageFees] = await Promise.all([
    studentService.getStudent(session, invoice.studentId).catch(() => null),
    classService.listClasses(session).catch(() => []),
    schoolService.getMySchool(session).catch(() => null),
    feeService.listPaymentsForInvoice(session, id),
    feeService.listReversalsForInvoice(session, id),
    userService.listUsersBySchool(session).catch(() => []),
    can(session.role, "feesCollect"),
  ]);

  const cls = student ? classes.find((c) => c.id === student.classId) : undefined;
  const userNameById = new Map(users.map((u) => [u.id, u.name]));
  const reversedPaymentIds = new Set(reversals.map((r) => r.paymentId));

  return (
    <InvoiceDetailClient
      invoice={{
        id: invoice.id,
        invoiceNo: invoice.invoiceNo,
        studentId: invoice.studentId,
        month: invoice.month,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
        items: invoice.items.map((i) => ({ id: i.id, name: i.name, amount: i.amount, isDiscount: i.isDiscount })),
      }}
      studentName={student?.name ?? "Unknown Student"}
      studentClassLabel={cls ? `${cls.grade}-${cls.section}` : ""}
      studentRollNumber={student?.rollNumber ?? "—"}
      studentParentName={student?.parentName ?? "—"}
      payments={payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        date: p.date,
        receivedByName: (p.receivedBy && userNameById.get(p.receivedBy)) ?? "Staff",
        reference: p.reference,
        wasReversed: reversedPaymentIds.has(p.id),
      }))}
      canManageFees={canManageFees}
      schoolName={school?.name ?? "School"}
      schoolAddress={school?.address ?? ""}
    />
  );
}
