import * as campusService from "@/services/campus.service";
import * as accountService from "@/services/account.service";
import { requireSession } from "@/lib/tenancy";
import { effectiveRole } from "@/lib/authorization";
import { AccountClient } from "@/app/(app)/account/account-client";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const [role, campuses, devices] = await Promise.all([effectiveRole(session), session.schoolId ? campusService.listCampuses(session) : Promise.resolve([]), accountService.listMyDevices(session)]);
  const campusName = session.campusId ? (campuses.find((c) => c.id === session.campusId)?.name ?? null) : null;

  return (
    <AccountClient
      name={session.name}
      email={session.email}
      roleName={role.name}
      campusName={campusName}
      mustChangePassword={session.mustChangePassword || params.required === "1"}
      devices={devices}
    />
  );
}
