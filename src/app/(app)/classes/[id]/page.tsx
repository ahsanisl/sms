import * as classService from "@/services/class.service";
import * as campusService from "@/services/campus.service";
import * as teacherService from "@/services/teacher.service";
import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
import { requireSession, NotFoundError } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { ClassDetailClient } from "@/app/(app)/classes/[id]/class-detail-client";

function attendanceRate(records: { status: string }[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status === "present" || r.status === "late").length;
  return Math.round((present / records.length) * 100);
}

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  let cls;
  try {
    cls = await classService.getClass(session, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return (
        <div className="text-center">
          <EmptyState icon="class" title="Class not found" description="It may have been removed, or belongs to a different school." />
          <Link href="/classes" className="text-label-md text-secondary hover:underline">
            Back to Classes
          </Link>
        </div>
      );
    }
    throw error;
  }

  const [campuses, teachers, allStudents, canManageStudents, canManageClasses] = await Promise.all([
    campusService.listCampuses(session),
    teacherService.listTeachers(session),
    studentService.listStudents(session),
    can(session.role, "studentsManage"),
    can(session.role, "classesManage"),
  ]);

  const campus = campuses.find((c) => c.id === cls.campusId);
  const classTeacher = teachers.find((t) => t.id === cls.classTeacherId);
  const roster = allStudents.filter((s) => s.classId === id);

  const rosterWithAttendance = await Promise.all(
    roster.map(async (s) => ({
      ...s,
      dob: s.dob ?? "",
      admissionDate: s.admissionDate ?? "",
      attendanceRate: attendanceRate(await attendanceService.listByStudent(session, s.id)),
    })),
  );
  const avgAttendance = rosterWithAttendance.length
    ? Math.round(rosterWithAttendance.reduce((sum, s) => sum + s.attendanceRate, 0) / rosterWithAttendance.length)
    : 0;

  return (
    <ClassDetailClient
      cls={cls}
      campusName={campus?.name ?? "—"}
      classTeacherName={classTeacher?.name ?? "Unassigned"}
      roster={rosterWithAttendance}
      avgAttendance={avgAttendance}
      canManageStudents={canManageStudents}
      canManageClasses={canManageClasses}
      campuses={campuses}
      teachers={teachers.map((t) => ({ ...t, classIds: [], joinDate: t.joinDate ?? "" }))}
    />
  );
}
