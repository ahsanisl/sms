import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
import * as feeService from "@/services/fee.service";
import * as examService from "@/services/exam.service";
import * as campusService from "@/services/campus.service";
import * as classService from "@/services/class.service";
import * as teacherService from "@/services/teacher.service";
import * as subjectService from "@/services/subject.service";
import { requireSession } from "@/lib/tenancy";
import { ReportsCenterClient } from "@/app/(app)/reports/reports-client";

export default async function ReportsCenterPage() {
  const session = await requireSession();

  // Every one of these services scopes to the caller's own campus(es)
  // server-side via scopedCampusIds; the inView lists additionally narrow to
  // the top bar switcher's campus, so the report matches what the rest of
  // the app is showing.
  const [campuses, classes, rawTeachers, students, subjects, exams] = await Promise.all([
    campusService.listCampusesInView(session),
    classService.listClasses(session, { inView: true }),
    teacherService.listTeachers(session, { inView: true }),
    studentService.listStudents(session, { inView: true }),
    subjectService.listSubjects(session),
    examService.listExams(session, { inView: true }),
  ]);

  const teachers = rawTeachers.map((t) => ({
    ...t,
    joinDate: t.joinDate ?? "",
    classIds: classes.filter((c) => c.classTeacherId === t.id && c.status === "active").map((c) => c.id),
  }));

  const [attendance, invoices, marks] = await Promise.all([
    attendanceService.listByClasses(session, classes.map((c) => c.id)),
    feeService.listInvoicesForStudents(session, students.map((s) => s.id)),
    examService.listMarksForExams(session, exams.map((e) => e.id)),
  ]);

  const reportData = {
    students: students.map((s) => ({ ...s, dob: s.dob ?? "", admissionDate: s.admissionDate ?? "" })),
    attendance: attendance.map((a) => ({ ...a, markedBy: a.markedBy ?? "" })),
    invoices,
    marks,
    exams,
    campuses,
    classes,
    teachers,
    subjects,
  };

  return <ReportsCenterClient reportData={reportData} isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"} />;
}
