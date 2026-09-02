"use server";

import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createStudentAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.createStudent(session, input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
