import "server-only";
import { db } from "@/db";
import { rolePermissions } from "@/db/schema";
import type { Role } from "@/lib/types";

export async function listAllRolePermissions() {
  return db.select().from(rolePermissions);
}

export async function setRolePermission(role: Role, module: string, allowed: boolean) {
  await db
    .insert(rolePermissions)
    .values({ role, module, allowed })
    .onConflictDoUpdate({ target: [rolePermissions.role, rolePermissions.module], set: { allowed } });
}
