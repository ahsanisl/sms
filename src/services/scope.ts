import "server-only";
import * as campusRepo from "@/repositories/campuses.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import * as timetableRepo from "@/repositories/timetable.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
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
 * Shared by Curriculum (status updates), Classwork, and Homework
 * (create/edit): may this *teacher* act on this exact (class, subject) pair?
 * Admin roles are never checked here — they're already scoped via the
 * normal campus check each of those services does first.
 *
 * Precise check: does the teacher have a published Timetable slot for this
 * exact class+subject? Falls back to "does this teacher teach this subject
 * anywhere in scope" (teacherSubjects) ONLY when *this class+subject pair
 * specifically* has no timetable slot at all yet (any teacher) — a
 * deliberate, narrow trust concession so a school still filling in its
 * Timetable subject-by-subject isn't blocked from using
 * Curriculum/Classwork/Homework for the subjects it hasn't scheduled yet.
 * The fallback is scoped to the subject, not just the class, so a class
 * with a Math slot already set but no English slot yet still lets an
 * English teacher through — checked live: this class-wide (not
 * subject-wide) version blocked a real teacher who only teaches a subject
 * the class's timetable hadn't reached yet.
 */
export async function assertTeacherTeachesClassSubject(session: AuthSession, classId: string, subjectId: string): Promise<void> {
  if (session.role !== "teacher") return;
  if (!session.teacherId) throw new PermissionError("classes");

  const slot = await timetableRepo.findSlotForTeacherClassSubject(session.teacherId, classId, subjectId);
  if (slot) return;

  const subjectAlreadyScheduled = await timetableRepo.slotExistsForClassSubject(classId, subjectId);
  if (!subjectAlreadyScheduled) {
    const teachesSubject = await teacherRepo.teacherTeachesSubject(session.teacherId, subjectId);
    if (teachesSubject) return;
  }

  throw new PermissionError("classes");
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
