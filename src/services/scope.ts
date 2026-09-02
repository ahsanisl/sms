import "server-only";
import * as campusRepo from "@/repositories/campuses.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import { requireSchoolId, NotFoundError, PermissionError, type AuthSession } from "@/lib/tenancy";

/**
 * The set of campus ids a session may touch, shared by every campus-scoped
 * service (classes, teachers, students, rooms, timetable, attendance, fees,
 * exams, admissions). A Campus Admin is narrowed to their own campus
 * server-side — never left to the caller/UI to filter (spec §6).
 */
export async function scopedCampusIds(session: AuthSession): Promise<string[]> {
  const schoolId = requireSchoolId(session);
  const campuses = await campusRepo.listCampuses(schoolId);
  const allIds = campuses.map((c) => c.id);
  if (session.role === "campus_admin" && session.campusId) {
    return allIds.includes(session.campusId) ? [session.campusId] : [];
  }
  return allIds;
}

export async function assertCampusInScope(session: AuthSession, campusId: string): Promise<void> {
  const ids = await scopedCampusIds(session);
  if (!ids.includes(campusId)) throw new PermissionError("campus");
}

/**
 * Ownership check for a single student, usable from any service that needs
 * to gate a per-student read without a blanket role-permission (e.g. a
 * parent viewing their own child's attendance/fees/marks — a parent has no
 * campusId of their own, so the normal campus-scoped lookup can't apply to
 * them). Throws NotFoundError (never a 403) rather than confirming a
 * student's existence to a caller who isn't allowed to see it — see the
 * spec's IDOR-prevention note. fee.service.ts and exam.service.ts each keep
 * their own copy of this same check (written before this shared version
 * existed); worth consolidating onto this one in a later pass.
 */
export async function assertStudentAccessible(session: AuthSession, studentId: string): Promise<void> {
  if (session.role === "parent") {
    const children = await userRepo.listChildrenForParent(session.userId);
    if (!children.some((c) => c.studentId === studentId)) throw new NotFoundError("Student");
    return;
  }
  const campusIds = await scopedCampusIds(session);
  const student = await studentRepo.getStudent(campusIds, studentId);
  if (!student) throw new NotFoundError("Student");
}
