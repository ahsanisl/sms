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
    studentService.listStudents(session),
    classService.listClasses(session),
    campusService.listCampuses(session),
    can(session.role, "studentsManage"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const rows = await Promise.all(
    students.map(async (s) => {
      const [attendance, invoices] = await Promise.all([
        attendanceService.listByStudent(session, s.id),
        feeService.listInvoicesForStudent(session, s.id),
      ]);
      const attendanceRate = attendance.length
        ? Math.round((attendance.filter((a) => a.status === "present" || a.status === "late").length / attendance.length) * 100)
        : 0;
      const currentInvoice = invoices.find((i) => i.month === currentMonthLabel);
      const cls = classById.get(s.classId);
      return {
        ...s,
        dob: s.dob ?? "",
        admissionDate: s.admissionDate ?? "",
        classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
        campusName: campusById.get(s.campusId)?.name ?? "—",
        attendanceRate,
        feeStatus: currentInvoice?.status ?? ("unpaid" as const),
      };
    }),
  );

  return <StudentsClient students={rows} classes={classes} campuses={campuses.filter((c) => c.status === "active")} canManage={canManage} />;
}
