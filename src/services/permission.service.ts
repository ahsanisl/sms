import "server-only";
import * as permissionsRepo from "@/repositories/permissions.repository";
import { requirePermission } from "@/lib/authorization";
import { type AuthSession } from "@/lib/tenancy";
import type { PermissionModule, Role } from "@/lib/types";

/**
 * The full role x module matrix backing Settings → Users & Roles. Platform-
 * wide, not scoped per school — mirrors the mock store's own `routePermissions`,
 * which was deliberately left unscoped by school for the same reason `users`
 * (pre-onboarding, no school context yet) was: see the multi-tenant work
 * earlier this session. The real `role_permissions` table has no schoolId
 * column at all, so this was never a gap to close, just a fact to carry
 * over unchanged.
 */
export async function listRolePermissions(session: AuthSession) {
  await requirePermission(session, "settingsUsers");
  return permissionsRepo.listAllRolePermissions();
}

/** Same two guardrails the mock UI's toggle() enforced — kept server-side now, not just in the client component. */
export async function updateRolePermission(session: AuthSession, role: Role, moduleKey: PermissionModule, allowed: boolean) {
  await requirePermission(session, "settingsUsers");
  if (moduleKey === "dashboard" && !allowed) {
    throw new Error("Every role needs Dashboard access — it's where they land after login.");
  }
  if (!allowed && moduleKey === "settingsUsers" && role === session.role) {
    throw new Error("You can't remove your own access to Users & Roles — have another admin change this instead.");
  }
  await permissionsRepo.setRolePermission(role, moduleKey, allowed);
}
