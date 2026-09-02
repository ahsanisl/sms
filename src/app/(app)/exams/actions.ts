"use server";

import { revalidatePath } from "next/cache";
import * as examService from "@/services/exam.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function publishResultsAction(examId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await examService.publishResults(session, examId);
    revalidatePath("/exams");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function unpublishResultsAction(examId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await examService.unpublishResults(session, examId);
    revalidatePath("/exams");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
