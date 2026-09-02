"use server";

import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
  count?: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function promoteStudentsAction(input: unknown, count: number): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.promoteStudents(session, input);
    return { success: true, count };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
