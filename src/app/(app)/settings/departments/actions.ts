"use server";

import { revalidatePath } from "next/cache";
import * as departmentService from "@/services/department.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createDepartmentAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await departmentService.createDepartment(session, input);
    revalidatePath("/settings/departments");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateDepartmentAction(departmentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await departmentService.updateDepartment(session, departmentId, input);
    revalidatePath("/settings/departments");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveDepartmentAction(departmentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await departmentService.archiveDepartment(session, departmentId);
    revalidatePath("/settings/departments");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
