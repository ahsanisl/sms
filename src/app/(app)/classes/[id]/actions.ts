"use server";

import { revalidatePath } from "next/cache";
import * as classService from "@/services/class.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function updateClassDetailAction(classId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await classService.updateClass(session, classId, input);
    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveClassDetailAction(classId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await classService.archiveClass(session, classId);
    revalidatePath("/classes");
    revalidatePath(`/classes/${classId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
