import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as feeService from "@/services/fee.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { LedgerClient } from "@/app/(app)/students/[id]/ledger/ledger-client";

export default async function StudentLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let student;
  try {
    student = await studentService.getStudent(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="person_off" title="Student not found" description="Go back to Students." />
          <Link href="/students" className="text-label-md text-secondary hover:underline">
            Back to Students
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [classes, campuses, invoices, payments, reversals] = await Promise.all([
    classService.listClasses(session),
    campusService.listCampuses(session),
    feeService.listInvoicesForStudent(session, id),
    feeService.listPaymentsForStudent(session, id),
    feeService.listReversalsForStudent(session, id),
  ]);

  const cls = classes.find((c) => c.id === student.classId);
  const campus = campuses.find((c) => c.id === student.campusId);

  return (
    <LedgerClient
      studentName={student.name}
      classLabel={cls ? `${cls.grade}-${cls.section}` : "—"}
      campusName={campus?.name ?? "—"}
      rollNumber={student.rollNumber}
      invoices={invoices.map((i) => ({ id: i.id, invoiceNo: i.invoiceNo, month: i.month, issueDate: i.issueDate, totalAmount: i.totalAmount }))}
      payments={payments.map((p) => ({ id: p.id, date: p.date, amount: p.amount, method: p.method, reference: p.reference }))}
      reversals={reversals.map((r) => ({ id: r.id, date: r.date, amount: r.amount, reason: r.reason }))}
    />
  );
}
