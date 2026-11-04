import { todayIso } from "@/lib/dates";
import "server-only";
import * as syllabusRepo from "@/repositories/syllabus.repository";
import * as classRepo from "@/repositories/classes.repository";
import * as sessionRepo from "@/repositories/academic-sessions.repository";
import * as userRepo from "@/repositories/users.repository";
import * as studentRepo from "@/repositories/students.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { SyllabusTopicInputSchema, SyllabusTopicStatusSchema } from "@/lib/validation/syllabus";
import { logAudit } from "@/services/audit.service";
import { assertTeacherTeachesClassSubject, scopedCampusIds } from "@/services/scope";
import { activeSession } from "@/lib/academic-session";

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

/** The school's currently-active session — every Syllabus read defaults to this when the caller doesn't pin a specific one. */
async function resolveSessionId(session: AuthSession, academicSessionId?: string): Promise<string | null> {
  if (academicSessionId) return academicSessionId;
  const schoolId = requireSchoolId(session);
  const sessions = await sessionRepo.listSessions(schoolId);
  return activeSession(sessions)?.id ?? null;
}

export async function listTopics(session: AuthSession, classId: string, subjectId: string, academicSessionId?: string) {
  await requirePermission(session, "syllabus");
  await assertClassInScope(session, classId);
  const resolvedSessionId = await resolveSessionId(session, academicSessionId);
  if (!resolvedSessionId) return [];
  return syllabusRepo.listTopics(classId, subjectId, resolvedSessionId);
}

/**
 * Parent-only: their own child's syllabus for one class+subject. No
 * "syllabus" role-permission gate at all (a parent never holds it, same
 * as "exams") — ownership is checked directly by confirming classId belongs
 * to one of the caller's own children, mirroring exam.service.getResultCardData.
 */
export async function listTopicsForParent(session: AuthSession, classId: string, subjectId: string, academicSessionId?: string) {
  if (session.role !== "parent") throw new PermissionError("syllabus");
  const children = await userRepo.listChildrenForParent(session.userId);
  const childStudents = await studentRepo.listByIds(children.map((c) => c.studentId));
  if (!childStudents.some((s) => s.classId === classId)) throw new NotFoundError("Class");
  const resolvedSessionId = await resolveSessionId(session, academicSessionId);
  if (!resolvedSessionId) return [];
  return syllabusRepo.listTopics(classId, subjectId, resolvedSessionId);
}

export async function createTopic(session: AuthSession, input: unknown) {
  await requirePermission(session, "syllabusManage");
  const data = SyllabusTopicInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  const created = await syllabusRepo.createTopic(data);
  await logAudit(session, "syllabus_topic.created", "SyllabusTopic", created.id);
  return created;
}

export async function updateTopic(session: AuthSession, topicId: string, input: unknown) {
  await requirePermission(session, "syllabusManage");
  const data = SyllabusTopicInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  const updated = await syllabusRepo.updateTopic(topicId, data);
  if (!updated) throw new NotFoundError("Syllabus topic");
  await logAudit(session, "syllabus_topic.updated", "SyllabusTopic", topicId);
  return updated;
}

/** The teacher-facing progress update — narrower gate than create/edit/delete, see assertTeacherTeachesClassSubject. */
export async function updateTopicStatus(session: AuthSession, topicId: string, status: unknown) {
  await requirePermission(session, "syllabus");
  const parsedStatus = SyllabusTopicStatusSchema.parse(status);
  const topic = await syllabusRepo.getTopic(topicId);
  if (!topic) throw new NotFoundError("Syllabus topic");
  await assertClassInScope(session, topic.classId);
  await assertTeacherTeachesClassSubject(session, topic.classId, topic.subjectId);
  const completedDate = parsedStatus === "completed" ? todayIso() : null;
  const updated = await syllabusRepo.updateStatus(topicId, parsedStatus, completedDate);
  await logAudit(session, "syllabus_topic.status_updated", "SyllabusTopic", topicId, { status: parsedStatus });
  return updated;
}

export async function deleteTopic(session: AuthSession, topicId: string) {
  await requirePermission(session, "syllabusManage");
  const topic = await syllabusRepo.getTopic(topicId);
  if (!topic) throw new NotFoundError("Syllabus topic");
  await assertClassInScope(session, topic.classId);
  await syllabusRepo.deleteTopic(topicId);
  await logAudit(session, "syllabus_topic.deleted", "SyllabusTopic", topicId);
}

export async function reorderTopics(session: AuthSession, classId: string, orderedIds: string[]) {
  await requirePermission(session, "syllabusManage");
  await assertClassInScope(session, classId);
  await syllabusRepo.reorderTopics(orderedIds);
  await logAudit(session, "syllabus_topic.reordered", "SyllabusTopic", classId);
}
