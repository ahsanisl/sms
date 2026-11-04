import "server-only";
import { cache } from "react";
import * as schoolRoleRepo from "@/repositories/school-roles.repository";
import { PermissionError, type AuthSession } from "@/lib/tenancy";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { PermissionModule, Role } from "@/lib/types";

export interface EffectiveRole {
  /** The school role in force, or null for platform_admin / a school with no roles (falls back to built-in defaults). */
  roleId: string | null;
  name: string;
  permissions: Partial<Record<PermissionModule, boolean>>;
}

/**
 * The role whose permissions apply to this user, resolved once per request:
 * - platform_admin → the built-in defaults (it has no school).
 * - school_owner → always full access within the school. The Owner role
 *   can't be restricted, so no one can lock the Owner out.
 * - everyone else → their assigned school role if it belongs to their own
 *   school and matches the built-in role they behave as, otherwise their
 *   school's default role for that built-in role.
 */
const loadEffectiveRole = cache(async (userId: string, role: Role, schoolId: string | null, schoolRoleId: string | null): Promise<EffectiveRole> => {
  void userId; // part of the cache key only
  if (!schoolId) {
    // platform_admin — no school, so no school roles. Its access is fixed in code (the Schools console + its dashboard).
    return { roleId: null, name: role === "platform_admin" ? "Platform Admin" : role, permissions: { ...DEFAULT_ROLE_PERMISSIONS[role] } };
  }

  let schoolRole = schoolRoleId ? await schoolRoleRepo.getRole(schoolId, schoolRoleId) : null;
  if (schoolRole && schoolRole.baseRole !== role) schoolRole = null; // stale or mismatched assignment — never trust it
  schoolRole ??= await schoolRoleRepo.getSystemRole(schoolId, role);

  if (role === "school_owner") {
    return { roleId: schoolRole?.id ?? null, name: schoolRole?.name ?? "School Owner", permissions: { ...DEFAULT_ROLE_PERMISSIONS.school_owner } };
  }
  if (!schoolRole) {
    // A school that somehow has no roles yet: built-in defaults rather than locking everyone out.
    return { roleId: null, name: role, permissions: { ...DEFAULT_ROLE_PERMISSIONS[role], settingsSchools: false } };
  }
  const rows = await schoolRoleRepo.listPermissionsForRole(schoolRole.id);
  const permissions = Object.fromEntries(rows.map((r) => [r.module, r.allowed])) as Partial<Record<PermissionModule, boolean>>;
  // Schools are a platform-level console — never grantable to a school role, whatever the row says.
  permissions.settingsSchools = false;
  return { roleId: schoolRole.id, name: schoolRole.name, permissions };
});

export function effectiveRole(session: AuthSession): Promise<EffectiveRole> {
  return loadEffectiveRole(session.userId, session.role, session.schoolId, session.schoolRoleId);
}

export async function can(session: AuthSession, moduleKey: PermissionModule): Promise<boolean> {
  const { permissions } = await effectiveRole(session);
  return permissions[moduleKey] === true;
}

/** Call at the top of every service function that gates a module — throws, doesn't just return false, so a forgotten check fails loudly instead of silently proceeding. */
export async function requirePermission(session: AuthSession, moduleKey: PermissionModule): Promise<void> {
  if (!(await can(session, moduleKey))) throw new PermissionError(moduleKey);
}
