import * as sessionService from "@/services/academic-session.service";
import { requireSession } from "@/lib/tenancy";
import { AcademicSessionsClient } from "@/app/(app)/settings/sessions/sessions-client";

export default async function AcademicSessionsPage() {
  const session = await requireSession();
  const sessions = await sessionService.listSessions(session);
  return <AcademicSessionsClient sessions={sessions} />;
}
