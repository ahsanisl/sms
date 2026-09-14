import "server-only";
import * as classworkRepo from "@/repositories/classwork.repository";
import * as classRepo from "@/repositories/classes.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import * as attachmentRepo from "@/repositories/attachments.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, type AuthSession } from "@/lib/tenancy";
import { ClassworkInputSchema } from "@/lib/validation/classwork";
import { logAudit } from "@/services/audit.service";
import { assertTeacherTeachesClassSubject, scopedCampusIds } from "@/services/scope";
import * as attachmentService from "@/services/attachment.service";
import * as studentService from "@/services/student.service";

const ATTACHMENT_MODULE = "classwork";

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

/** Every class id within the caller's campus scope — classwork.repository's functions filter by classId directly (not campusId, since classwork has no campusId column of its own), so callers must resolve this first. */
async function scopedClassIds(session: AuthSession): Promise<string[]> {
  const campusIds = await scopedCampusIds(session);
  const classes = await classRepo.listClasses(campusIds);
  return classes.map((c) => c.id);
}

/** A teacher's own session.teacherId always wins — an admin picks who it's attributed to, validated against the class's campus. */
async function resolveTeacherId(session: AuthSession, campusId: string, submittedTeacherId?: string): Promise<string> {
  if (session.role === "teacher") {
    if (!session.teacherId) throw new PermissionError("classwork");
    return session.teacherId;
  }
  if (!submittedTeacherId) throw new Error("Select which teacher this is for.");
  const teacher = await teacherRepo.getTeacher([campusId], submittedTeacherId);
  if (!teacher) throw new NotFoundError("Teacher");
  return teacher.id;
}

/**
 * Staff-only list — requires the "classwork" role permission a parent never
 * holds (same shape as "exams"). A parent's own /portal/classwork calls
 * listClassworkForParent instead, which has no permission gate at all.
 */
export async function listClasswork(session: AuthSession, classId?: string) {
  await requirePermission(session, "classwork");
  const campusIds = await scopedCampusIds(session);
  const classes = await classRepo.listClasses(campusIds);
  const classIds = classId ? classes.filter((c) => c.id === classId).map((c) => c.id) : classes.map((c) => c.id);
  return classworkRepo.listClasswork(classIds);
}

/** Parent-only: every classwork entry across their own children's classes — ownership via listMyChildren, no role-permission gate. */
export async function listClassworkForParent(session: AuthSession) {
  if (session.role !== "parent") throw new PermissionError("classwork");
  const children = await studentService.listMyChildren(session);
  return classworkRepo.listClasswork(children.map((c) => c.classId));
}

/**
 * Single-record read used by both the /api/files ownership check and (were
 * one ever built) a detail view — branches on role internally, exactly
 * like exam.service.getResultCardData: a parent is checked by ownership
 * only (their own child's class), staff by the normal role permission.
 * Throws (never returns null) if the caller can't see it.
 */
export async function getClasswork(session: AuthSession, classworkId: string) {
  if (session.role === "parent") {
    const rows = await listClassworkForParent(session);
    const row = rows.find((r) => r.id === classworkId);
    if (!row) throw new NotFoundError("Classwork");
    return row;
  }
  await requirePermission(session, "classwork");
  const row = await classworkRepo.getClasswork(await scopedClassIds(session), classworkId);
  if (!row) throw new NotFoundError("Classwork");
  return row;
}

export async function createClasswork(session: AuthSession, input: unknown) {
  await requirePermission(session, "classworkCreate");
  const data = ClassworkInputSchema.parse(input);
  const cls = await assertClassInScope(session, data.classId);
  await assertTeacherTeachesClassSubject(session, data.classId, data.subjectId);
  const teacherId = await resolveTeacherId(session, cls.campusId, data.teacherId);

  const created = await classworkRepo.createClasswork({
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId,
    curriculumTopicId: data.curriculumTopicId ?? null,
    date: data.date,
    title: data.title,
    description: data.description,
  });
  await logAudit(session, "classwork.created", "Classwork", created.id);
  return created;
}

export async function updateClasswork(session: AuthSession, classworkId: string, input: unknown) {
  await requirePermission(session, "classworkCreate");
  const data = ClassworkInputSchema.parse(input);
  const cls = await assertClassInScope(session, data.classId);
  await assertTeacherTeachesClassSubject(session, data.classId, data.subjectId);
  const teacherId = await resolveTeacherId(session, cls.campusId, data.teacherId);

  const updated = await classworkRepo.updateClasswork(await scopedClassIds(session), classworkId, {
    classId: data.classId,
    subjectId: data.subjectId,
    teacherId,
    curriculumTopicId: data.curriculumTopicId ?? null,
    date: data.date,
    title: data.title,
    description: data.description,
  });
  if (!updated) throw new NotFoundError("Classwork");
  await logAudit(session, "classwork.updated", "Classwork", classworkId);
  return updated;
}

export async function deleteClasswork(session: AuthSession, classworkId: string) {
  await requirePermission(session, "classworkCreate");
  const classIds = await scopedClassIds(session);
  const existing = await classworkRepo.getClasswork(classIds, classworkId);
  if (!existing) throw new NotFoundError("Classwork");
  for (const attachment of await attachmentRepo.listAttachments(ATTACHMENT_MODULE, classworkId)) {
    await attachmentService.deleteAttachment(session, attachment.id);
  }
  await classworkRepo.deleteClasswork(classIds, classworkId);
  await logAudit(session, "classwork.deleted", "Classwork", classworkId);
}

export async function addAttachment(session: AuthSession, classworkId: string, file: File) {
  await requirePermission(session, "classworkCreate");
  const existing = await classworkRepo.getClasswork(await scopedClassIds(session), classworkId);
  if (!existing) throw new NotFoundError("Classwork");
  return attachmentService.saveAttachment(session, ATTACHMENT_MODULE, classworkId, file);
}

export async function listAttachments(session: AuthSession, classworkId: string) {
  await getClasswork(session, classworkId); // throws if not viewable
  return attachmentService.listAttachments(session, ATTACHMENT_MODULE, classworkId);
}
