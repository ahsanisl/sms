import "server-only";
import * as subjectRepo from "@/repositories/subjects.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { SubjectInputSchema } from "@/lib/validation/subject";
import { logAudit } from "@/services/audit.service";

export async function listSubjects(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return subjectRepo.listSubjects(schoolId);
}

export async function createSubject(session: AuthSession, input: unknown) {
  await requirePermission(session, "settingsSubjects");
  const schoolId = requireSchoolId(session);
  const data = SubjectInputSchema.parse(input);
  const subject = await subjectRepo.createSubject(schoolId, { ...data, status: "active" });
  await logAudit(session, "subject.created", "Subject", subject.id);
  return subject;
}

export async function updateSubject(session: AuthSession, subjectId: string, input: unknown) {
  await requirePermission(session, "settingsSubjects");
  const schoolId = requireSchoolId(session);
  const existing = await subjectRepo.getSubject(schoolId, subjectId);
  if (!existing) throw new NotFoundError("Subject");
  const data = SubjectInputSchema.parse(input);
  const updated = await subjectRepo.updateSubject(schoolId, subjectId, data);
  await logAudit(session, "subject.updated", "Subject", subjectId);
  return updated;
}

export async function archiveSubject(session: AuthSession, subjectId: string) {
  await requirePermission(session, "settingsSubjects");
  const schoolId = requireSchoolId(session);
  const existing = await subjectRepo.getSubject(schoolId, subjectId);
  if (!existing) throw new NotFoundError("Subject");
  await subjectRepo.archiveSubject(schoolId, subjectId);
  await logAudit(session, "subject.archived", "Subject", subjectId);
}
