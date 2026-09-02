import "server-only";
import { cache } from "react";
import { listAllRolePermissions } from "@/repositories/permissions.repository";
import { PermissionError, type AuthSession } from "@/lib/tenancy";
import type { PermissionModule, Role } from "@/lib/types";

/**
 * The DB-backed replacement for the mock's DEFAULT_ROLE_PERMISSIONS. Loaded
 * once per request (React's `cache()` de-dupes repeat calls within the same
 * render/request) so checking a dozen permissions doesn't mean a dozen
 * queries. This is what backs the live-editable Settings → Users & Roles
 * matrix once that screen is wired to the database.
 */
const loadPermissionMatrix = cache(async (): Promise<Record<string, boolean>> => {
  const rows = await listAllRolePermissions();
  const matrix: Record<string, boolean> = {};
  for (const row of rows) {
    matrix[`${row.role}:${row.module}`] = row.allowed;
  }
  return matrix;
});

export async function can(role: Role, moduleKey: PermissionModule): Promise<boolean> {
  const matrix = await loadPermissionMatrix();
  return matrix[`${role}:${moduleKey}`] ?? false;
}

/** Call at the top of every service function that gates a module — throws, doesn't just return false, so a forgotten check fails loudly instead of silently proceeding. */
export async function requirePermission(session: AuthSession, moduleKey: PermissionModule): Promise<void> {
  const allowed = await can(session.role, moduleKey);
  if (!allowed) throw new PermissionError(moduleKey);
}
