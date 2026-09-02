import "server-only";
import * as sessionRepo from "@/repositories/academic-sessions.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { SessionInputSchema } from "@/lib/validation/academic-session";
import { logAudit } from "@/services/audit.service";

export async function listSessions(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  return sessionRepo.listSessions(schoolId);
}

export async function createSession(session: AuthSession, input: unknown) {
  await requirePermission(session, "settings");
  const schoolId = requireSchoolId(session);
  const data = SessionInputSchema.parse(input);
  const created = await sessionRepo.createSession(schoolId, { label: data.label, startDate: data.startDate, endDate: data.endDate, isActive: false }, data.terms);
  await logAudit(session, "academic_session.created", "AcademicSession", created.id);
  return created;
}

export async function updateSession(session: AuthSession, sessionId: string, input: unknown) {
  await requirePermission(session, "settings");
  const schoolId = requireSchoolId(session);
  const existing = await sessionRepo.getSession(schoolId, sessionId);
  if (!existing) throw new NotFoundError("Academic session");
  const data = SessionInputSchema.parse(input);
  const updated = await sessionRepo.updateSession(schoolId, sessionId, { label: data.label, startDate: data.startDate, endDate: data.endDate });
  await logAudit(session, "academic_session.updated", "AcademicSession", sessionId);
  return updated;
}

export async function setActiveSession(session: AuthSession, sessionId: string) {
  await requirePermission(session, "settings");
  const schoolId = requireSchoolId(session);
  const existing = await sessionRepo.getSession(schoolId, sessionId);
  if (!existing) throw new NotFoundError("Academic session");
  await sessionRepo.setActiveSession(schoolId, sessionId);
  await logAudit(session, "academic_session.activated", "AcademicSession", sessionId);
}
