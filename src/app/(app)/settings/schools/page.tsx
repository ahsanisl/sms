import * as schoolService from "@/services/school.service";
import { requireSession } from "@/lib/tenancy";
import { SchoolsClient } from "@/app/(app)/settings/schools/schools-client";

export default async function SchoolManagementPage() {
  const session = await requireSession();
  const rows = await schoolService.listAllSchoolsWithStats(session);

  const schools = rows.map(({ school, stats }) => ({
    school: {
      id: school.id,
      name: school.name,
      tagline: school.tagline,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoEmoji: school.logoEmoji,
      reportCardFooter: school.reportCardFooter,
      showSignatureLines: school.showSignatureLines,
      status: school.status,
      onboardingComplete: school.onboardingComplete,
    },
    stats,
  }));

  return <SchoolsClient schools={schools} />;
}
