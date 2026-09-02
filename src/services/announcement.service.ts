import "server-only";
import * as announcementRepo from "@/repositories/announcements.repository";
import { requirePermission } from "@/lib/authorization";
import { requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { AnnouncementInputSchema } from "@/lib/validation/announcement";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

export async function listAnnouncements(session: AuthSession) {
  const schoolId = requireSchoolId(session);
  const campusIds = await scopedCampusIds(session);
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
