import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { FeesDashboardClient } from "@/app/(app)/fees/fees-dashboard-client";
import { GRADE_ORDER } from "@/lib/mock/reference-data";

export default async function FeesPage() {
  const session = await requireSession();
  const [classes, students, canManageStructure] = await Promise.all([
    classService.listClasses(session),
    studentService.listStudents(session),
    can(session.role, "feesStructure"),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));
  const studentIds = students.map((s) => s.id);
  const [invoices, payments] = await Promise.all([
    feeService.listInvoicesForStudents(session, studentIds),
    feeService.listPaymentsForStudents(session, studentIds),
  ]);

  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const currentMonth = invoices.filter((i) => i.month === currentMonthLabel);

  const totalRevenue = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const collectedThisMonth = currentMonth.reduce((s, i) => s + i.paidAmount, 0);
  const outstanding = currentMonth.reduce((s, i) => s + (i.totalAmount - i.paidAmount), 0);
  const overdueCount = currentMonth.filter((i) => i.status === "overdue").length;

  const collectionByGrade = GRADE_ORDER.map((grade) => {
    const gradeClassIds = new Set(classes.filter((c) => c.grade === grade).map((c) => c.id));
    const gradeStudentIds = new Set(students.filter((s) => gradeClassIds.has(s.classId)).map((s) => s.id));
    const collected = currentMonth.filter((i) => gradeStudentIds.has(i.studentId)).reduce((s, i) => s + i.paidAmount, 0);
    return { grade: grade.replace("Grade ", "G"), collected };
  });

  const recentTransactions = [...payments]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map((p) => ({ id: p.id, studentName: studentById.get(p.studentId)?.name ?? "Unknown", method: p.method, amount: p.amount, date: p.date }));

  return (
    <FeesDashboardClient
      totalRevenue={totalRevenue}
      collectedThisMonth={collectedThisMonth}
      outstanding={outstanding}
      overdueCount={overdueCount}
      collectionByGrade={collectionByGrade}
      recentTransactions={recentTransactions}
      currentMonthCount={currentMonth.length}
      currentMonthPaidCount={currentMonth.filter((i) => i.status === "paid").length}
      currentMonthUnpaidCount={currentMonth.filter((i) => i.status === "unpaid").length}
      canManageStructure={canManageStructure}
    />
  );
}
