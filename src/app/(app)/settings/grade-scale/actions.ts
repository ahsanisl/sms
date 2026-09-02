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

export async function saveGradeScaleAction(bands: { grade: string; minPercentage: number }[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await examService.setGradeBands(session, bands);
    revalidatePath("/settings/grade-scale");
    revalidatePath("/exams");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
