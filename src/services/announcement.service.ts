import "server-only";
import * as announcementRepo from "@/repositories/announcements.repository";
import * as studentRepo from "@/repositories/students.repository";
import * as userRepo from "@/repositories/users.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { AnnouncementInputSchema } from "@/lib/validation/announcement";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, listScopeCampusIds, type ListScope } from "@/services/scope";

/**
 * Which campuses' announcements this viewer gets on top of school-wide ones.
 * A parent or teacher isn't campus-scoped the way staff are (scopedCampusIds
 * gives them the whole school), so narrow them to the campuses they actually
 * belong to: a parent's children's campuses, a teacher's own campus.
 */
async function announcementCampusIds(session: AuthSession, scope?: ListScope): Promise<string[]> {
  if (session.role === "parent") {
    const links = await userRepo.listChildrenForParent(session.userId);
    const children = await studentRepo.listByIds(links.map((l) => l.studentId));
    return [...new Set(children.map((c) => c.campusId))];
  }
  if (session.role === "teacher" && session.campusId) return [session.campusId];
  return listScopeCampusIds(session, scope);
}

export async function listAnnouncements(session: AuthSession, scope?: ListScope) {
  const schoolId = requireSchoolId(session);
  const campusIds = await announcementCampusIds(session, scope);
  return announcementRepo.listAnnouncements(schoolId, campusIds);
}

export async function createAnnouncement(session: AuthSession, input: unknown) {
  await requirePermission(session, "announcementsCreate");
  const schoolId = requireSchoolId(session);
  const data = AnnouncementInputSchema.parse(input);
  if (data.campusId) await assertCampusInScope(session, data.campusId);
  const created = await announcementRepo.createAnnouncement({
    schoolId,
    campusId: data.campusId ?? null,
    title: data.title,
    body: data.body,
    audience: data.audience,
    priority: data.priority,
    author: session.name,
  });
  await logAudit(session, "announcement.created", "Announcement", created.id);
  return created;
}

export async function deleteAnnouncement(session: AuthSession, announcementId: string) {
  await requirePermission(session, "announcementsCreate");
  const schoolId = requireSchoolId(session);
  await announcementRepo.deleteAnnouncement(schoolId, announcementId);
  await logAudit(session, "announcement.deleted", "Announcement", announcementId);
}
