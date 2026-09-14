import "server-only";
import * as curriculumRepo from "@/repositories/curriculum.repository";
import * as classRepo from "@/repositories/classes.repository";
import * as sessionRepo from "@/repositories/academic-sessions.repository";
import * as userRepo from "@/repositories/users.repository";
import * as studentRepo from "@/repositories/students.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { CurriculumTopicInputSchema, CurriculumTopicStatusSchema } from "@/lib/validation/curriculum";
import { logAudit } from "@/services/audit.service";
import { assertTeacherTeachesClassSubject, scopedCampusIds } from "@/services/scope";
import { activeSession } from "@/lib/mock/sessions";

async function assertClassInScope(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

/** The school's currently-active session — every Curriculum read defaults to this when the caller doesn't pin a specific one. */
async function resolveSessionId(session: AuthSession, academicSessionId?: string): Promise<string | null> {
  if (academicSessionId) return academicSessionId;
  const schoolId = requireSchoolId(session);
  const sessions = await sessionRepo.listSessions(schoolId);
  return activeSession(sessions)?.id ?? null;
}

export async function listTopics(session: AuthSession, classId: string, subjectId: string, academicSessionId?: string) {
  await requirePermission(session, "curriculum");
  await assertClassInScope(session, classId);
  const resolvedSessionId = await resolveSessionId(session, academicSessionId);
  if (!resolvedSessionId) return [];
  return curriculumRepo.listTopics(classId, subjectId, resolvedSessionId);
}

/**
 * Parent-only: their own child's curriculum for one class+subject. No
 * "curriculum" role-permission gate at all (a parent never holds it, same
 * as "exams") — ownership is checked directly by confirming classId belongs
 * to one of the caller's own children, mirroring exam.service.getResultCardData.
 */
export async function listTopicsForParent(session: AuthSession, classId: string, subjectId: string, academicSessionId?: string) {
  if (session.role !== "parent") throw new PermissionError("curriculum");
  const children = await userRepo.listChildrenForParent(session.userId);
  const childStudents = await studentRepo.listByIds(children.map((c) => c.studentId));
  if (!childStudents.some((s) => s.classId === classId)) throw new NotFoundError("Class");
  const resolvedSessionId = await resolveSessionId(session, academicSessionId);
  if (!resolvedSessionId) return [];
  return curriculumRepo.listTopics(classId, subjectId, resolvedSessionId);
}

export async function createTopic(session: AuthSession, input: unknown) {
  await requirePermission(session, "curriculumManage");
  const data = CurriculumTopicInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  const created = await curriculumRepo.createTopic(data);
  await logAudit(session, "curriculum_topic.created", "CurriculumTopic", created.id);
  return created;
}

export async function updateTopic(session: AuthSession, topicId: string, input: unknown) {
  await requirePermission(session, "curriculumManage");
  const data = CurriculumTopicInputSchema.parse(input);
  await assertClassInScope(session, data.classId);
  const updated = await curriculumRepo.updateTopic(topicId, data);
  if (!updated) throw new NotFoundError("Curriculum topic");
  await logAudit(session, "curriculum_topic.updated", "CurriculumTopic", topicId);
  return updated;
}

/** The teacher-facing progress update — narrower gate than create/edit/delete, see assertTeacherTeachesClassSubject. */
export async function updateTopicStatus(session: AuthSession, topicId: string, status: unknown) {
  await requirePermission(session, "curriculum");
  const parsedStatus = CurriculumTopicStatusSchema.parse(status);
  const topic = await curriculumRepo.getTopic(topicId);
  if (!topic) throw new NotFoundError("Curriculum topic");
  await assertClassInScope(session, topic.classId);
  await assertTeacherTeachesClassSubject(session, topic.classId, topic.subjectId);
  const completedDate = parsedStatus === "completed" ? new Date().toISOString().slice(0, 10) : null;
  const updated = await curriculumRepo.updateStatus(topicId, parsedStatus, completedDate);
  await logAudit(session, "curriculum_topic.status_updated", "CurriculumTopic", topicId, { status: parsedStatus });
  return updated;
}

export async function deleteTopic(session: AuthSession, topicId: string) {
  await requirePermission(session, "curriculumManage");
  const topic = await curriculumRepo.getTopic(topicId);
  if (!topic) throw new NotFoundError("Curriculum topic");
  await assertClassInScope(session, topic.classId);
  await curriculumRepo.deleteTopic(topicId);
  await logAudit(session, "curriculum_topic.deleted", "CurriculumTopic", topicId);
}

export async function reorderTopics(session: AuthSession, classId: string, orderedIds: string[]) {
  await requirePermission(session, "curriculumManage");
  await assertClassInScope(session, classId);
  await curriculumRepo.reorderTopics(orderedIds);
  await logAudit(session, "curriculum_topic.reordered", "CurriculumTopic", classId);
}
