import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { GenerateInvoicesClient } from "@/app/(app)/fees/generate/generate-client";

export default async function GenerateInvoicesPage() {
  const session = await requireSession();
  const [campuses, classes, students, structureItems] = await Promise.all([
    campusService.listCampuses(session),
    classService.listClasses(session),
    studentService.listStudents(session),
    feeService.listStructureItems(session),
  ]);

  const activeStudents = students.filter((s) => s.status === "active");
  const invoices = await feeService.listInvoicesForStudents(session, activeStudents.map((s) => s.id));

  const existingInvoiceMonthsByStudent = new Map<string, Set<string>>();
  for (const inv of invoices) {
    const set = existingInvoiceMonthsByStudent.get(inv.studentId) ?? new Set<string>();
    set.add(inv.month);
    existingInvoiceMonthsByStudent.set(inv.studentId, set);
  }

  return (
    <GenerateInvoicesClient
      students={activeStudents.map((s) => ({ ...s, dob: s.dob ?? "", admissionDate: s.admissionDate ?? "" }))}
      classes={classes}
      campuses={campuses.filter((c) => c.status === "active")}
      structureItems={structureItems}
      existingInvoiceMonthsByStudent={existingInvoiceMonthsByStudent}
      defaultCampusId={session.role === "campus_admin" ? (session.campusId ?? undefined) : undefined}
      isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"}
    />
  );
}
