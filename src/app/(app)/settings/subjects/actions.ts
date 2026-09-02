"use server";

import { revalidatePath } from "next/cache";
import * as subjectService from "@/services/subject.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createSubjectAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await subjectService.createSubject(session, input);
    revalidatePath("/settings/subjects");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateSubjectAction(subjectId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await subjectService.updateSubject(session, subjectId, input);
    revalidatePath("/settings/subjects");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveSubjectAction(subjectId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await subjectService.archiveSubject(session, subjectId);
    revalidatePath("/settings/subjects");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
