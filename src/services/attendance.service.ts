import "server-only";
import * as attendanceRepo from "@/repositories/attendance.repository";
import * as classRepo from "@/repositories/classes.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, type AuthSession } from "@/lib/tenancy";
import { AttendanceCorrectionInputSchema, MarkAttendanceBulkSchema } from "@/lib/validation/attendance";
import { logAudit } from "@/services/audit.service";
import { assertStudentAccessible, scopedCampusIds } from "@/services/scope";

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  // A teacher may only mark attendance for their own class (spec §25's "teacher authorization").
  if (session.role === "teacher" && cls.classTeacherId !== session.teacherId) {
    throw new PermissionError("attendanceMark");
  }
  return cls;
}

export async function listByClassAndDate(session: AuthSession, classId: string, date: string) {
  await requirePermission(session, "attendance");
  await assertClassInScope(session, classId);
  return attendanceRepo.listByClassAndDate([classId], date);
}

/**
 * No blanket "attendance" gate — a parent viewing their own child's history
 * has no campus/attendance permission at all, so ownership (assertStudentAccessible)
 * is the real boundary here, same reasoning as fee.service/exam.service's
 * always-allowed single-record reads.
 */
export async function listByStudent(session: AuthSession, studentId: string) {
  await assertStudentAccessible(session, studentId);
  return attendanceRepo.listByStudent(studentId);
}

/** Every record for a set of already-scoped classIds — used by the dashboard/reports' cumulative aggregates. */
export async function listByClasses(session: AuthSession, classIds: string[]) {
  await requirePermission(session, "attendance");
  return attendanceRepo.listByClasses(classIds);
}

export async function markAttendanceBulk(session: AuthSession, input: unknown) {
  await requirePermission(session, "attendanceMark");
  const entries = MarkAttendanceBulkSchema.parse(input);
  const classIds = [...new Set(entries.map((e) => e.classId))];
  for (const classId of classIds) {
    await assertClassInScope(session, classId);
  }
  await attendanceRepo.markAttendanceBulk(entries.map((e) => ({ ...e, markedBy: session.userId })));
  await logAudit(session, "attendance.marked", "AttendanceRecord", undefined, { classIds, date: entries[0]?.date, count: entries.length });
}

export async function requestCorrection(session: AuthSession, input: unknown) {
  await requirePermission(session, "attendance");
  const data = AttendanceCorrectionInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  const correction = await attendanceRepo.addCorrection({ ...data, requestedBy: session.userId });
  await logAudit(session, "attendance.correction_requested", "AttendanceCorrection", correction.id);
  return correction;
}

export async function listCorrections(session: AuthSession) {
  await requirePermission(session, "attendance");
  const campusIds = await scopedCampusIds(session);
  const classes = await classRepo.listClasses(campusIds);
  return attendanceRepo.listCorrections(classes.map((c) => c.id));
}

/**
 * Approve/reject a correction — this is an admin/campus-admin/owner action,
 * never a teacher one (mirrors the mock UI, which never renders Approve/
 * Reject controls for a teacher session). The generic "attendance" module is
 * too broad a gate on its own since teachers also have it (to view their own
 * requests), so a teacher role is explicitly rejected here too — the UI
 * already never offers this action to a teacher, but the server must not
 * rely on that alone.
 */
export async function reviewCorrection(session: AuthSession, correctionId: string, status: "approved" | "rejected", reviewNote?: string) {
  await requirePermission(session, "attendance");
  if (session.role === "teacher") throw new PermissionError("attendance");
  const reviewed = await attendanceRepo.reviewCorrection(correctionId, status, session.userId, reviewNote);
  if (!reviewed) throw new NotFoundError("Attendance correction");
  await logAudit(session, "attendance.correction_reviewed", "AttendanceCorrection", correctionId, { status });
  return reviewed;
}
