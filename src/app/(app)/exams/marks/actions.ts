"use server";

import * as examService from "@/services/exam.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * The Marks Entry UI has one "Save Marks" button, matching the mock's single-
 * step flow — under the hood this both enters the marks (drafted) and hands
 * them straight to admin review, since the mock never exposed an
 * intermediate "saved but not yet submitted" state for teachers.
 */
export async function saveMarksAction(examId: string, entries: unknown[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await examService.enterMarksBulk(session, entries);
    await examService.submitMarksForReview(session, examId);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
