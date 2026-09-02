import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as teacherService from "@/services/teacher.service";
import * as attendanceService from "@/services/attendance.service";
import * as feeService from "@/services/fee.service";
import * as examService from "@/services/exam.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { StudentDetailClient } from "@/app/(app)/students/[id]/student-detail-client";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let student;
  try {
    student = await studentService.getStudent(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="person_off" title="Student not found" description="This student may have been removed, or you don't have access to it." />
          <Link href="/students" className="text-label-md text-secondary hover:underline">
            Back to Students
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [classes, campuses, teachers, attendance, invoices, resultData, lifecycleEvents, gradeBands, canManage, canRequestCorrection] = await Promise.all([
    classService.listClasses(session),
    campusService.listCampuses(session),
    teacherService.listTeachers(session),
    attendanceService.listByStudent(session, student.id),
    feeService.listInvoicesForStudent(session, student.id),
    examService.getResultCardData(session, student.id),
    studentService.listLifecycleEvents(session, student.id),
    examService.listGradeBands(session),
    can(session.role, "studentsManage"),
    can(session.role, "attendanceMark"),
  ]);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const campusById = new Map(campuses.map((c) => [c.id, c]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const cls = classById.get(student.classId);

  const attendanceRate = attendance.length
    ? Math.round((attendance.filter((a) => a.status === "present" || a.status === "late").length / attendance.length) * 100)
    : 0;

  const classLabel = (classId: string | null | undefined) => {
    if (!classId) return "—";
    const c = classById.get(classId);
    return c ? `${c.grade}-${c.section}` : "—";
  };
  const campusName = (campusId: string | null | undefined) => (campusId ? (campusById.get(campusId)?.name ?? "—") : "—");

  return (
    <StudentDetailClient
      student={{ ...student, dob: student.dob ?? "", admissionDate: student.admissionDate ?? "" }}
      classGrade={cls?.grade ?? "—"}
      classSection={cls?.section ?? "—"}
      classTeacherName={cls ? (teacherById.get(cls.classTeacherId)?.name ?? "—") : "—"}
      attendanceRate={attendanceRate}
      attendanceRecords={attendance.map((a) => ({ id: a.id, date: a.date, status: a.status, classId: a.classId }))}
      invoices={invoices.map((i) => ({ id: i.id, invoiceNo: i.invoiceNo, month: i.month, totalAmount: i.totalAmount, paidAmount: i.paidAmount, status: i.status }))}
      examSummary={resultData.exams.map((exam) => {
        const entries = resultData.marks.filter((m) => m.examId === exam.id);
        const obtained = entries.reduce((s, e) => s + e.obtainedMarks, 0);
        const outOf = entries.reduce((s, e) => s + e.totalMarks, 0);
        return { id: exam.id, name: exam.name, term: exam.term, obtained, outOf, percentage: outOf ? Math.round((obtained / outOf) * 100) : 0 };
      })}
      lifecycleEvents={lifecycleEvents.map((e) => ({
        id: e.id,
        type: e.type,
        date: e.date,
        reason: e.reason,
        resultingStatus: e.resultingStatus,
        fromClassLabel: classLabel(e.fromClassId),
        toClassLabel: classLabel(e.toClassId),
        fromCampusName: campusName(e.fromCampusId),
        toCampusName: campusName(e.toCampusId),
        leavingCertificateIssued: e.leavingCertificateIssued === "true",
      }))}
      campuses={campuses.filter((c) => c.status === "active")}
      classes={classes}
      gradeBands={gradeBands.map((b) => ({ grade: b.grade, minPercentage: b.minPercentage }))}
      canManage={canManage}
      canRequestCorrection={canRequestCorrection}
    />
  );
}
