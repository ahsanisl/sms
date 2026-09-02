import * as admissionService from "@/services/admission.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { AdmissionsClient } from "@/app/(app)/admissions/admissions-client";

export default async function AdmissionsPage() {
  const session = await requireSession();
  const [inquiries, campuses] = await Promise.all([admissionService.listInquiries(session), campusService.listCampuses(session)]);
  const campusById = new Map(campuses.map((c) => [c.id, c]));

  const rows = inquiries.map((i) => ({
    id: i.id,
    childName: i.childName,
    gradeAppliedFor: i.gradeAppliedFor,
    campusId: i.campusId,
    campusName: campusById.get(i.campusId)?.name ?? "—",
    parentName: i.parentName,
    parentPhone: i.parentPhone,
    source: i.source,
    updatedAt: i.updatedAt.toISOString().slice(0, 10),
    stage: i.stage,
  }));

  return (
    <AdmissionsClient
      inquiries={rows}
      campuses={campuses.filter((c) => c.status === "active")}
      isAllCampuses={campuses.length > 1 && session.role !== "campus_admin"}
    />
  );
}
