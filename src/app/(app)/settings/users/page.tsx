import * as permissionService from "@/services/permission.service";
import * as userService from "@/services/user.service";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";
import { UsersAndRolesClient } from "@/app/(app)/settings/users/users-roles-client";
import type { PermissionModule, Role } from "@/lib/types";

export default async function UsersAndRolesPage() {
  const session = await requireSession();
  const [rows, users, campuses] = await Promise.all([
    permissionService.listRolePermissions(session),
    userService.listUsersBySchool(session),
    campusService.listCampuses(session),
  ]);

  const campusById = new Map(campuses.map((c) => [c.id, c.name]));

  const matrix: Record<string, Partial<Record<PermissionModule, boolean>>> = {};
  for (const row of rows) {
    const moduleKey = row.module as PermissionModule;
    (matrix[row.role] ??= {})[moduleKey] = row.allowed;
  }

  const userRows = users
    .filter((u) => u.role !== "platform_admin")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as Role,
      campusName: u.campusId ? (campusById.get(u.campusId) ?? "—") : "All Campuses",
    }));

  return <UsersAndRolesClient matrix={matrix} users={userRows} currentRole={session.role} />;
}
