import * as classService from "@/services/class.service";
import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";
import { MarkAttendanceClient } from "@/app/(app)/attendance/mark/mark-attendance-client";
import type { AttendanceStatus } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function MarkAttendancePage({ searchParams }: { searchParams: Promise<{ classId?: string; date?: string }> }) {
  const { classId: requestedClassId, date: requestedDate } = await searchParams;
  const session = await requireSession();

  const allClasses = await classService.listClasses(session);
  // A teacher may only mark their own class — tighter than the campus-wide
  // scoping other roles get, matching the server-side check markAttendanceBulk
  // already enforces (see attendance.service.ts's assertClassInScope).
  const scopedClasses =
    session.role === "teacher"
      ? allClasses.filter((c) => c.classTeacherId === session.teacherId && c.status === "active")
      : allClasses.filter((c) => c.status === "active");

  const classId = requestedClassId && scopedClasses.some((c) => c.id === requestedClassId) ? requestedClassId : (scopedClasses[0]?.id ?? "");
  const date = requestedDate || todayIso();

  const students = await studentService.listStudents(session);
  const roster = students.filter((s) => s.classId === classId && s.status === "active");

  const existingRecords = classId ? await attendanceService.listByClassAndDate(session, classId, date) : [];
  const initialStatuses: Record<string, AttendanceStatus> = {};
  for (const r of existingRecords) {
    initialStatuses[r.studentId] = r.status;
  }

  const cls = scopedClasses.find((c) => c.id === classId);

  return (
    <MarkAttendanceClient
      key={`${classId}-${date}`}
      classes={scopedClasses.map((c) => ({ id: c.id, label: `${c.grade}-${c.section}` }))}
      classId={classId}
      classLabel={cls ? `${cls.grade}-${cls.section}` : ""}
      date={date}
      roster={roster.map((s) => ({ id: s.id, name: s.name, rollNumber: s.rollNumber }))}
      initialStatuses={initialStatuses}
    />
  );
}
