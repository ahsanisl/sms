import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { CreateAnnouncementClient } from "@/app/(app)/announcements/create/create-announcement-client";

export default async function CreateAnnouncementPage() {
  const session = await requireSession();
  const campuses = await campusService.listCampuses(session);
  const activeCampuses = campuses.filter((c) => c.status === "active");

  const fixedCampus = session.role === "campus_admin" ? activeCampuses.find((c) => c.id === session.campusId) : undefined;

  return (
    <CreateAnnouncementClient
      campuses={activeCampuses}
      fixedCampusId={fixedCampus?.id}
      fixedCampusName={fixedCampus?.name}
    />
  );
}
