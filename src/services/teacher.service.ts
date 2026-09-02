import "server-only";
import * as teacherRepo from "@/repositories/teachers.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { TeacherInputSchema } from "@/lib/validation/teacher";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

// listTeachers/getTeacher deliberately have no requirePermission("teachers")
// gate — teacher names (and, transitively, their full directory row) are
// already visible to any authenticated in-tenant viewer via the Timetable,
// same as classService/roomService/subjectService's reads; only
// create/update/delete are actually gated below. Without this, a parent
// (who lacks the "teachers" module) couldn't view a published timetable at
// all, since it needs teacher names to render each period.
export async function listTeachers(session: AuthSession) {
  const campusIds = await scopedCampusIds(session);
  return teacherRepo.listTeachers(campusIds);
}

export async function getTeacher(session: AuthSession, teacherId: string) {
  const campusIds = await scopedCampusIds(session);
  const teacher = await teacherRepo.getTeacher(campusIds, teacherId);
  if (!teacher) throw new NotFoundError("Teacher");
  return teacher;
}

export async function createTeacher(session: AuthSession, input: unknown) {
  await requirePermission(session, "teachers");
  const data = TeacherInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, ...rest } = data;
  const created = await teacherRepo.createTeacher(campusId, rest);
  await logAudit(session, "teacher.created", "Teacher", created.id);
  return created;
}

export async function updateTeacher(session: AuthSession, teacherId: string, input: unknown) {
  await requirePermission(session, "teachers");
  const data = TeacherInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const campusIds = await scopedCampusIds(session);
  const rest = {
    name: data.name,
    employeeId: data.employeeId,
    subjectIds: data.subjectIds,
    phone: data.phone,
    email: data.email,
    qualification: data.qualification,
    joinDate: data.joinDate,
    status: data.status,
  };
  const updated = await teacherRepo.updateTeacher(campusIds, teacherId, rest);
  if (!updated) throw new NotFoundError("Teacher");
  await logAudit(session, "teacher.updated", "Teacher", teacherId);
  return updated;
}

export async function deleteTeacher(session: AuthSession, teacherId: string) {
  await requirePermission(session, "teachers");
  const campusIds = await scopedCampusIds(session);
  const existing = await teacherRepo.getTeacher(campusIds, teacherId);
  if (!existing) throw new NotFoundError("Teacher");
  await teacherRepo.deleteTeacher(campusIds, teacherId);
  await logAudit(session, "teacher.deleted", "Teacher", teacherId);
}
