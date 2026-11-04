import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import type { PermissionModule, Role } from "@/lib/types";

/** The six default roles every school gets (same names/descriptions as migration 0005, which created them for existing schools). */
export const SYSTEM_ROLE_DEFS: { baseRole: Role; name: string; description: string }[] = [
  { baseRole: "school_owner", name: "School Owner", description: "Full access to everything in the school. Can't be restricted." },
  { baseRole: "school_admin", name: "School Admin", description: "Runs the whole school, across all campuses." },
  { baseRole: "campus_admin", name: "Campus Admin", description: "Runs one campus; only sees that campus's data." },
  { baseRole: "teacher", name: "Teacher", description: "Teaching staff; works with their own classes." },
  { baseRole: "accountant", name: "Accountant", description: "Fees and finance only." },
  { baseRole: "parent", name: "Parent", description: "Parent portal; sees only their own children." },
];

/**
 * Built-in roles a custom role can be based on. The base decides data scope
 * and dashboard; the custom role's checkboxes decide module access. Owner
 * (unique, unrestricted) and Parent (portal tied to linked children) can't be
 * used as a base.
 */
export const CUSTOM_ROLE_BASES: { baseRole: Role; label: string; scope: string }[] = [
  { baseRole: "school_admin", label: "School Admin", scope: "Whole school — every campus" },
  { baseRole: "campus_admin", label: "Campus Admin", scope: "One campus only — chosen per user" },
  { baseRole: "teacher", label: "Teacher", scope: "Their own classes — needs a linked teacher profile" },
  { baseRole: "accountant", label: "Accountant", scope: "Whole school, finance dashboard" },
];

/** Modules a school role can be granted — everything except the platform-only Schools console. */
export const SCHOOL_ROLE_MODULES: PermissionModule[] = (Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[]).filter((m) => m !== "settingsSchools");

/** Modules a school role must always keep. */
export const ALWAYS_ON_MODULES: PermissionModule[] = ["dashboard"];

/** Rows for a brand-new school's default roles and their default permissions (ids generated here so the permission rows can reference them in one batch). */
export function systemRoleRows(schoolId: string) {
  const roles = SYSTEM_ROLE_DEFS.map((def) => ({ id: crypto.randomUUID(), schoolId, name: def.name, description: def.description, baseRole: def.baseRole, isSystem: true }));
  const permissions = roles.flatMap((role) =>
    SCHOOL_ROLE_MODULES.map((module) => ({ roleId: role.id, module, allowed: DEFAULT_ROLE_PERMISSIONS[role.baseRole][module] })),
  );
  return { roles, permissions };
}
