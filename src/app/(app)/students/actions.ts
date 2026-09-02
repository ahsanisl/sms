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

export async function updateStudentAction(studentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.updateStudent(session, studentId, input);
    revalidatePath("/students");
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteStudentAction(studentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.deleteStudent(session, studentId);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
