"use server";

import { revalidatePath } from "next/cache";
import * as studentService from "@/services/student.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function reactivateStudentAction(studentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.reactivateStudent(session, studentId, new Date().toISOString().slice(0, 10), "Reactivated from Alumni Directory");
    revalidatePath("/students/alumni");
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
