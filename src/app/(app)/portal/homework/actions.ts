"use server";

import { revalidatePath } from "next/cache";
import * as homeworkService from "@/services/homework.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function submitHomeworkAction(homeworkId: string, studentId: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const submissionText = String(formData.get("submissionText") ?? "");
    const file = formData.get("file");
    await homeworkService.submitHomework(
      session,
      homeworkId,
      studentId,
      { submissionText },
      file instanceof File && file.size > 0 ? file : undefined,
    );
    revalidatePath(`/portal/homework/${homeworkId}`);
    revalidatePath("/portal/homework");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
