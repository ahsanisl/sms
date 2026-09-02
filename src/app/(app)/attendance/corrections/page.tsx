import * as attendanceService from "@/services/attendance.service";
import * as studentService from "@/services/student.service";
import * as classService from "@/services/class.service";
import * as userService from "@/services/user.service";
import { requireSession } from "@/lib/tenancy";
import { CorrectionsClient } from "@/app/(app)/attendance/corrections/corrections-client";

export default async function AttendanceCorrectionsPage() {
  const session = await requireSession();
  const [corrections, students, classes, users] = await Promise.all([
    attendanceService.listCorrections(session),
    studentService.listStudents(session),
    classService.listClasses(session),
    userService.listUsersBySchool(session),
  ]);

  const studentById = new Map(students.map((s) => [s.id, s]));
  const classById = new Map(classes.map((c) => [c.id, c]));
  const userNameById = new Map(users.map((u) => [u.id, u.name]));

  const isTeacher = session.role === "teacher";
  const scoped = isTeacher ? corrections.filter((c) => c.requestedBy === session.userId) : corrections;

  const rows = scoped.map((c) => {
    const cls = classById.get(c.classId);
    return {
      id: c.id,
      studentName: studentById.get(c.studentId)?.name ?? "Unknown Student",
      classLabel: cls ? `${cls.grade}-${cls.section}` : "—",
      date: c.date,
      currentStatus: c.currentStatus,
      requestedStatus: c.requestedStatus,
      reason: c.reason,
      status: c.status,
      requestedByName: userNameById.get(c.requestedBy) ?? "Staff",
      reviewedByName: c.reviewedBy ? (userNameById.get(c.reviewedBy) ?? "Staff") : null,
    };
  });

  return <CorrectionsClient isTeacher={isTeacher} corrections={rows} />;
}
