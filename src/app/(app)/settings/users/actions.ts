"use server";

import { revalidatePath } from "next/cache";
import * as permissionService from "@/services/permission.service";
import * as accountService from "@/services/account.service";
import { requireSession } from "@/lib/tenancy";
import type { PermissionModule } from "@/lib/types";

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

function errorMessage(error: unknown): string {
  // A ZodError's .message is a JSON dump of every issue — show the first issue's own message instead.
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string }[] }).issues[0];
    if (issue?.message) return issue.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function run(work: (session: Awaited<ReturnType<typeof requireSession>>) => Promise<{ id?: string } | unknown>): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const result = await work(session);
    revalidatePath("/settings/users");
    const id = result && typeof result === "object" && "id" in result && typeof result.id === "string" ? result.id : undefined;
    return { success: true, id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateRolePermissionAction(roleId: string, moduleKey: PermissionModule, allowed: boolean) {
  return run((session) => permissionService.setRolePermission(session, roleId, moduleKey, allowed));
}

export async function createRoleAction(input: unknown) {
  return run((session) => permissionService.createRole(session, input));
}

export async function updateRoleAction(roleId: string, input: unknown) {
  return run((session) => permissionService.updateRole(session, roleId, input));
}

export async function deleteRoleAction(roleId: string) {
  return run((session) => permissionService.deleteRole(session, roleId));
}

export async function assignUserRoleAction(userId: string, input: unknown) {
  return run((session) => permissionService.assignUserRole(session, userId, input));
}

/** Returns the new temporary password once, for the admin to pass on — it isn't stored anywhere in plain text. */
export async function resetUserPasswordAction(userId: string): Promise<ActionResult & { temporaryPassword?: string }> {
  try {
    const session = await requireSession();
    const { temporaryPassword } = await accountService.resetUserPassword(session, userId);
    revalidatePath("/settings/users");
    return { success: true, temporaryPassword };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function createUserAction(input: unknown) {
  return run((session) => permissionService.createUser(session, input));
}
