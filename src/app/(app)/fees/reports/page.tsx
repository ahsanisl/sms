import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { FeeReportsClient } from "@/app/(app)/fees/reports/reports-client";

export default async function FeeReportsPage() {
  const session = await requireSession();
  const [campuses, classes, students] = await Promise.all([
    campusService.listCampuses(session),
    classService.listClasses(session),
    studentService.listStudents(session),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));
  const classById = new Map(classes.map((c) => [c.id, c]));
  const studentIds = students.map((s) => s.id);

  const [payments, invoices] = await Promise.all([
    feeService.listPaymentsForStudents(session, studentIds),
    feeService.listInvoicesForStudents(session, studentIds),
  ]);

  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const currentMonthInvoices = invoices.filter((i) => i.month === currentMonthLabel);
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = currentMonthInvoices.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueCount = currentMonthInvoices.filter((i) => i.status === "overdue").length;

  const paymentRows = payments.map((p) => {
    const student = studentById.get(p.studentId);
    const cls = student ? classById.get(student.classId) : undefined;
    return {
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.method,
      studentName: student?.name ?? "—",
      studentCampusId: student?.campusId ?? "",
      classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
    };
  });

  return (
    <FeeReportsClient
      payments={paymentRows}
      campuses={campuses.filter((c) => c.status === "active")}
      totalCollected={totalCollected}
      totalOutstanding={totalOutstanding}
      overdueCount={overdueCount}
      isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"}
    />
  );
}
