import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { ParentFeesClient } from "@/app/(app)/portal/fees/fees-client";

export default async function ParentFeesPage() {
  const session = await requireSession();
  const [children, classes] = await Promise.all([studentService.listMyChildren(session), classService.listClasses(session)]);
  const classById = new Map(classes.map((c) => [c.id, c]));

  const invoices = await feeService.listInvoicesForStudents(session, children.map((c) => c.id));

  const rows = children.map((child) => {
    const cls = classById.get(child.classId);
    const childInvoices = invoices
      .filter((i) => i.studentId === child.id)
      .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
    return {
      id: child.id,
      name: child.name,
      classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
      rollNumber: child.rollNumber,
      invoices: childInvoices.map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        month: i.month,
        issueDate: i.issueDate,
        dueDate: i.dueDate,
        totalAmount: i.totalAmount,
        paidAmount: i.paidAmount,
        status: i.status,
      })),
    };
  });

  return <ParentFeesClient childRows={rows} />;
}
