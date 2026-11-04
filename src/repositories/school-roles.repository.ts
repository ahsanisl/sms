import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { schoolRolePermissions, schoolRoles, users, type NewSchoolRole } from "@/db/schema";
import { systemRoleRows } from "@/lib/school-roles";
import type { Role } from "@/lib/types";

/** db itself or an open transaction — so a new school and its roles can be created atomically. */
type Executor = Pick<typeof db, "insert">;

export async function listRoles(schoolId: string) {
  return db.select().from(schoolRoles).where(eq(schoolRoles.schoolId, schoolId)).orderBy(schoolRoles.isSystem, schoolRoles.createdAt);
}

export async function getRole(schoolId: string, roleId: string) {
  const [row] = await db
    .select()
    .from(schoolRoles)
    .where(and(eq(schoolRoles.id, roleId), eq(schoolRoles.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

/** The school's default role for a built-in role (null only for a school that predates per-school roles and was never migrated). */
export async function getSystemRole(schoolId: string, baseRole: Role) {
  const [row] = await db
    .select()
    .from(schoolRoles)
    .where(and(eq(schoolRoles.schoolId, schoolId), eq(schoolRoles.baseRole, baseRole), eq(schoolRoles.isSystem, true)))
    .limit(1);
  return row ?? null;
}

export async function findRoleByName(schoolId: string, name: string) {
  const [row] = await db
    .select()
    .from(schoolRoles)
    .where(and(eq(schoolRoles.schoolId, schoolId), eq(schoolRoles.name, name)))
    .limit(1);
  return row ?? null;
}

export async function createRole(input: NewSchoolRole, permissions: { module: string; allowed: boolean }[]) {
  return db.transaction(async (tx) => {
    const [role] = await tx.insert(schoolRoles).values(input).returning();
    if (permissions.length) await tx.insert(schoolRolePermissions).values(permissions.map((p) => ({ ...p, roleId: role.id })));
    return role;
  });
}

export async function updateRole(schoolId: string, roleId: string, input: { name?: string; description?: string }) {
  const [row] = await db
    .update(schoolRoles)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(schoolRoles.id, roleId), eq(schoolRoles.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

export async function deleteRole(schoolId: string, roleId: string) {
  await db.delete(schoolRoles).where(and(eq(schoolRoles.id, roleId), eq(schoolRoles.schoolId, schoolId), eq(schoolRoles.isSystem, false)));
}

export async function listPermissionsForRole(roleId: string) {
  return db.select().from(schoolRolePermissions).where(eq(schoolRolePermissions.roleId, roleId));
}

/** Every role's permissions in one school, for the Users & Roles matrix. */
export async function listPermissionsForSchool(schoolId: string) {
  return db
    .select({ roleId: schoolRolePermissions.roleId, module: schoolRolePermissions.module, allowed: schoolRolePermissions.allowed })
    .from(schoolRolePermissions)
    .innerJoin(schoolRoles, eq(schoolRoles.id, schoolRolePermissions.roleId))
    .where(eq(schoolRoles.schoolId, schoolId));
}

export async function setPermission(roleId: string, module: string, allowed: boolean) {
  await db
    .insert(schoolRolePermissions)
    .values({ roleId, module, allowed })
    .onConflictDoUpdate({ target: [schoolRolePermissions.roleId, schoolRolePermissions.module], set: { allowed } });
}

/** Users explicitly assigned this role. (Users on a default role may instead have a null school_role_id — the service counts those.) */
export async function countUsersAssigned(roleId: string) {
  const [row] = await db.select({ total: count() }).from(users).where(eq(users.schoolRoleId, roleId));
  return row?.total ?? 0;
}

/** Creates a new school's six default roles with default permissions. Pass the transaction that creates the school. */
export async function createSystemRoles(executor: Executor, schoolId: string) {
  const { roles, permissions } = systemRoleRows(schoolId);
  await executor.insert(schoolRoles).values(roles);
  await executor.insert(schoolRolePermissions).values(permissions);
  return roles;
}
