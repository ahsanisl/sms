import "server-only";
import * as campusRepo from "@/repositories/campuses.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, NotFoundError, type AuthSession } from "@/lib/tenancy";
import { CampusInputSchema } from "@/lib/validation/campus";
import { logAudit } from "@/services/audit.service";

export async function listCampuses(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  const all = await campusRepo.listCampuses(schoolId);
  // Campus Admin only ever sees their own campus, even in a "list" call — server-enforced, not filtered client-side.
  if (session.role === "campus_admin" && session.campusId) {
    return all.filter((c) => c.id === session.campusId);
  }
  return all;
}

export async function createCampus(session: AuthSession, input: unknown) {
  await requirePermission(session, "settingsCampuses");
  const schoolId = requireSchoolId(session);
  const data = CampusInputSchema.parse(input);
  const campus = await campusRepo.createCampus(schoolId, { ...data, status: "active" });
  await logAudit(session, "campus.created", "Campus", campus.id);
  return campus;
}

export async function updateCampus(session: AuthSession, campusId: string, input: unknown) {
  await requirePermission(session, "settingsCampuses");
  const schoolId = requireSchoolId(session);
  const existing = await campusRepo.getCampus(schoolId, campusId);
  if (!existing) throw new NotFoundError("Campus");
  const data = CampusInputSchema.parse(input);
  const updated = await campusRepo.updateCampus(schoolId, campusId, data);
  await logAudit(session, "campus.updated", "Campus", campusId);
  return updated;
}

export async function archiveCampus(session: AuthSession, campusId: string) {
  await requirePermission(session, "settingsCampuses");
  const schoolId = requireSchoolId(session);
  const existing = await campusRepo.getCampus(schoolId, campusId);
  if (!existing) throw new NotFoundError("Campus");
  await campusRepo.archiveCampus(schoolId, campusId);
  await logAudit(session, "campus.archived", "Campus", campusId);
}
