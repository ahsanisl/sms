import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { NewInquiryClient } from "@/app/(app)/admissions/new/new-inquiry-client";

export default async function LogInquiryPage() {
  const session = await requireSession();
  const campuses = await campusService.listCampuses(session);

  return (
    <NewInquiryClient
      campuses={campuses.filter((c) => c.status === "active")}
      defaultCampusId={session.role === "campus_admin" ? (session.campusId ?? undefined) : undefined}
    />
  );
}
