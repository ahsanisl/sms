import { currentMonthLabel as getCurrentMonthLabel } from "@/lib/dates";
import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as attendanceService from "@/services/attendance.service";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { StudentsClient } from "@/app/(app)/students/students-client";

export default async function StudentsPage() {
  const session = await requireSession();
  const [students, classes, campuses, canManage] = await Promise.all([
    studentService.listStudents(session, { inView: true }),
    classService.listClasses(session),
    campusService.listCampuses(session),
    can(session, "studentsManage"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const currentMonthLabel = getCurrentMonthLabel();

  // Two queries for the whole list (not two per student): the students above are already scoped to what this user may see.
  const studentIds = students.map((s) => s.id);
  const [attendanceRates, invoices] = await Promise.all([
    attendanceService.ratesForStudents(session, studentIds),
    feeService.listInvoicesForStudents(session, studentIds),
  ]);
  const currentInvoiceByStudent = new Map(invoices.filter((i) => i.month === currentMonthLabel).map((i) => [i.studentId, i]));

  const rows = students.map((s) => {
    const cls = classById.get(s.classId);
    return {
      ...s,
      dob: s.dob ?? "",
      admissionDate: s.admissionDate ?? "",
      classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
      campusName: campusById.get(s.campusId)?.name ?? "—",
      attendanceRate: attendanceRates.get(s.id) ?? 0,
      feeStatus: currentInvoiceByStudent.get(s.id)?.status ?? ("unpaid" as const),
    };
  });

  return <StudentsClient students={rows} classes={classes} campuses={campuses.filter((c) => c.status === "active")} canManage={canManage} />;
}
