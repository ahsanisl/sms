import * as permissionService from "@/services/permission.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { UsersAndRolesClient } from "@/app/(app)/settings/users/users-roles-client";

export default async function UsersAndRolesPage() {
  const session = await requireSession();
  const [data, campuses, teachersWithoutLogin] = await Promise.all([
    permissionService.getUsersAndRoles(session),
    campusService.listCampuses(session),
    permissionService.listTeachersWithoutLogin(session),
  ]);

  return (
    <UsersAndRolesClient
      roles={data.roles.map((r) => ({ id: r.id, name: r.name, description: r.description, baseRole: r.baseRole, isSystem: r.isSystem, userCount: r.userCount }))}
      matrix={data.matrix}
      users={data.users}
      campuses={campuses.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))}
      teachersWithoutLogin={teachersWithoutLogin}
      currentUserId={data.currentUserId}
      currentRoleId={data.currentRoleId}
      isOwner={data.isOwner}
    />
  );
}
