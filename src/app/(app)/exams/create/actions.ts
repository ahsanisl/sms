"use server";

import * as examService from "@/services/exam.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
  examId?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createExamAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const exam = await examService.createExam(session, input);
    return { success: true, examId: exam.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
