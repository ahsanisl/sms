import "server-only";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { PromoteStudentsSchema, StudentInputSchema, TransferStudentSchema, WithdrawStudentSchema } from "@/lib/validation/student";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, assertStudentAccessible, scopedCampusIds } from "@/services/scope";
import * as classRepo from "@/repositories/classes.repository";

/** The Parent portal's own read: a parent's children, resolved via parentChildren — never campus-scoped, since a parent has no campusId of their own. */
export async function listMyChildren(session: AuthSession) {
  if (session.role !== "parent") return [];
  const links = await userRepo.listChildrenForParent(session.userId);
  return studentRepo.listByIds(links.map((l) => l.studentId));
}

/** A parent must only ever see their own children in "the student list" — never the school's full roster (a parent has no campus scoping, so the normal campus-scoped list would otherwise return every student in the school). */
export async function listStudents(session: AuthSession) {
  if (session.role === "parent") return listMyChildren(session);
  await requirePermission(session, "students");
  const campusIds = await scopedCampusIds(session);
  return studentRepo.listStudents(campusIds);
}

/** Ownership-scoped (assertStudentAccessible), not a blanket "students" permission gate — a parent viewing their own child's profile has no campus scoping to fall back on. */
export async function getStudent(session: AuthSession, studentId: string) {
  await assertStudentAccessible(session, studentId);
  const student = session.role === "parent" ? await studentRepo.getStudentById(studentId) : await studentRepo.getStudent(await scopedCampusIds(session), studentId);
  if (!student) throw new NotFoundError("Student");
  return student;
}

export async function createStudent(session: AuthSession, input: unknown) {
  await requirePermission(session, "studentsManage");
  const data = StudentInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const created = await studentRepo.createStudent(data);
  await logAudit(session, "student.created", "Student", created.id);
  return created;
}

export async function updateStudent(session: AuthSession, studentId: string, input: unknown) {
  await requirePermission(session, "studentsManage");
  const data = StudentInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const campusIds = await scopedCampusIds(session);
  const updated = await studentRepo.updateStudent(campusIds, studentId, data);
  if (!updated) throw new NotFoundError("Student");
  await logAudit(session, "student.updated", "Student", studentId);
  return updated;
}

export async function withdrawStudent(session: AuthSession, studentId: string, input: unknown) {
  await requirePermission(session, "studentsManage");
  const data = WithdrawStudentSchema.parse(input);
  const campusIds = await scopedCampusIds(session);
  const existing = await studentRepo.getStudent(campusIds, studentId);
  if (!existing) throw new NotFoundError("Student");
  await studentRepo.updateStudent(campusIds, studentId, { status: data.resultingStatus });
  await studentRepo.addLifecycleEvent({
    studentId,
    type: "withdrawal",
    date: data.date,
    reason: data.reason ?? null,
    resultingStatus: data.resultingStatus,
    fromClassId: null,
    toClassId: null,
    fromCampusId: null,
    toCampusId: null,
    leavingCertificateIssued: data.leavingCertificateIssued ? "true" : null,
    recordedBy: session.userId,
  });
  await logAudit(session, "student.withdrawn", "Student", studentId, { resultingStatus: data.resultingStatus });
}

export async function reactivateStudent(session: AuthSession, studentId: string, date: string, reason?: string) {
  await requirePermission(session, "studentsManage");
  const campusIds = await scopedCampusIds(session);
  const existing = await studentRepo.getStudent(campusIds, studentId);
  if (!existing) throw new NotFoundError("Student");
  await studentRepo.updateStudent(campusIds, studentId, { status: "active" });
  await studentRepo.addLifecycleEvent({
    studentId,
    type: "reactivation",
    date,
    reason: reason ?? null,
    resultingStatus: "active",
    fromClassId: null,
    toClassId: null,
    fromCampusId: null,
    toCampusId: null,
    leavingCertificateIssued: null,
    recordedBy: session.userId,
  });
  await logAudit(session, "student.reactivated", "Student", studentId);
}

export async function transferStudent(session: AuthSession, studentId: string, input: unknown) {
  await requirePermission(session, "studentsManage");
  const data = TransferStudentSchema.parse(input);
  const campusIds = await scopedCampusIds(session);
  const existing = await studentRepo.getStudent(campusIds, studentId);
  if (!existing) throw new NotFoundError("Student");
  if (data.toCampusId) await assertCampusInScope(session, data.toCampusId);

  await studentRepo.updateStudent(campusIds, studentId, {
    classId: data.toClassId ?? existing.classId,
    campusId: data.toCampusId ?? existing.campusId,
  });
  await studentRepo.addLifecycleEvent({
    studentId,
    type: "transfer",
    date: data.date,
    reason: data.reason ?? null,
    resultingStatus: null,
    fromClassId: existing.classId,
    toClassId: data.toClassId ?? existing.classId,
    fromCampusId: existing.campusId,
    toCampusId: data.toCampusId ?? existing.campusId,
    leavingCertificateIssued: null,
    recordedBy: session.userId,
  });
  await logAudit(session, "student.transferred", "Student", studentId);
}

export async function listLifecycleEvents(session: AuthSession, studentId: string) {
  await assertStudentAccessible(session, studentId);
  return studentRepo.listLifecycleEvents(studentId);
}

export async function deleteStudent(session: AuthSession, studentId: string) {
  await requirePermission(session, "studentsManage");
  const campusIds = await scopedCampusIds(session);
  const existing = await studentRepo.getStudent(campusIds, studentId);
  if (!existing) throw new NotFoundError("Student");
  await studentRepo.deleteStudent(campusIds, studentId);
  await logAudit(session, "student.deleted", "Student", studentId);
}

/**
 * Year-end bulk promotion — every included student either moves up to a new
 * class or graduates to Alumni, one lifecycle event per student, all in one
 * transaction.
 */
export async function promoteStudents(session: AuthSession, input: unknown) {
  await requirePermission(session, "studentsManage");
  const data = PromoteStudentsSchema.parse(input);
  const campusIds = await scopedCampusIds(session);
  const fromClass = await classRepo.getClass(campusIds, data.fromClassId);
  if (!fromClass) throw new NotFoundError("Class");
  if (data.toClassId) {
    const toClass = await classRepo.getClass(campusIds, data.toClassId);
    if (!toClass) throw new NotFoundError("Target class");
  }

  // Every included student must actually belong to fromClassId and be in the caller's scope — never trust the client-supplied id list on its own.
  const roster = await studentRepo.listStudents(campusIds);
  const validIds = new Set(roster.filter((s) => s.classId === data.fromClassId && s.status === "active").map((s) => s.id));
  const items = data.studentIds.filter((id) => validIds.has(id)).map((id) => ({ studentId: id, toClassId: data.toAlumni ? null : (data.toClassId ?? null) }));
  if (items.length === 0) throw new NotFoundError("Student");

  await studentRepo.promoteStudentsBulk(items, data.date, session.userId);
  await logAudit(session, "students.promoted", "Class", data.fromClassId, { count: items.length, toClassId: data.toClassId, toAlumni: data.toAlumni });
}
