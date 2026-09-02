import "server-only";
import * as classRepo from "@/repositories/classes.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { ClassInputSchema } from "@/lib/validation/class";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

export async function listClasses(session: AuthSession) {
  const campusIds = await scopedCampusIds(session);
  return classRepo.listClasses(campusIds);
}

export async function getClass(session: AuthSession, classId: string) {
  const campusIds = await scopedCampusIds(session);
  const cls = await classRepo.getClass(campusIds, classId);
  if (!cls) throw new NotFoundError("Class");
  return cls;
}

export async function createClass(session: AuthSession, input: unknown) {
  await requirePermission(session, "classesManage");
  const data = ClassInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const { campusId, ...rest } = data;
  const created = await classRepo.createClass(campusId, { ...rest, status: "active" });
  await logAudit(session, "class.created", "Class", created.id);
  return created;
}

export async function updateClass(session: AuthSession, classId: string, input: unknown) {
  await requirePermission(session, "classesManage");
  const data = ClassInputSchema.parse(input);
  // A class's campus is fixed at creation — editing doesn't move it between campuses (its students/rooms/teachers wouldn't follow).
  await assertCampusInScope(session, data.campusId);
  const campusIds = await scopedCampusIds(session);
  const rest = { grade: data.grade, section: data.section, classTeacherId: data.classTeacherId, subjectIds: data.subjectIds, studentCapacity: data.studentCapacity };
  const updated = await classRepo.updateClass(campusIds, classId, { ...rest, status: "active" });
  if (!updated) throw new NotFoundError("Class");
  await logAudit(session, "class.updated", "Class", classId);
  return updated;
}

export async function archiveClass(session: AuthSession, classId: string) {
  await requirePermission(session, "classesManage");
  const campusIds = await scopedCampusIds(session);
  const existing = await classRepo.getClass(campusIds, classId);
  if (!existing) throw new NotFoundError("Class");
  await classRepo.archiveClass(campusIds, classId);
  await logAudit(session, "class.archived", "Class", classId);
}
