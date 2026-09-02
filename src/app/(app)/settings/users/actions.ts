"use server";

import { revalidatePath } from "next/cache";
import * as permissionService from "@/services/permission.service";
import { requireSession } from "@/lib/tenancy";
import type { PermissionModule, Role } from "@/lib/types";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function updateRolePermissionAction(role: Role, moduleKey: PermissionModule, allowed: boolean): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await permissionService.updateRolePermission(session, role, moduleKey, allowed);
    revalidatePath("/settings/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
