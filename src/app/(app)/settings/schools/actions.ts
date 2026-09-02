"use server";

import { revalidatePath } from "next/cache";
import * as schoolService from "@/services/school.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createSchoolWithOwnerAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await schoolService.createSchoolWithOwner(session, input);
    revalidatePath("/settings/schools");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateSchoolAction(schoolId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await schoolService.updateSchool(session, schoolId, input);
    revalidatePath("/settings/schools");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveSchoolAction(schoolId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await schoolService.archiveSchool(session, schoolId);
    revalidatePath("/settings/schools");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
