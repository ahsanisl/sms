import * as announcementService from "@/services/announcement.service";
import { requireSession } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import { AnnouncementsClient } from "@/app/(app)/announcements/announcements-client";

export default async function AnnouncementsPage() {
  const session = await requireSession();
  const [announcements, canManage] = await Promise.all([announcementService.listAnnouncements(session), can(session.role, "announcementsCreate")]);

  const rows = announcements
    .map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      priority: a.priority,
      author: a.author,
      publishedAt: a.publishedAt.toISOString(),
    }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  return <AnnouncementsClient announcements={rows} canManage={canManage} />;
}
