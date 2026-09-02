"use server";

import { revalidatePath } from "next/cache";
import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
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
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function withdrawStudentAction(studentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.withdrawStudent(session, studentId, input);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function transferStudentAction(studentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.transferStudent(session, studentId, input);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function reactivateStudentAction(studentId: string, date: string, reason?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await studentService.reactivateStudent(session, studentId, date, reason);
    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function requestAttendanceCorrectionAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await attendanceService.requestCorrection(session, input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
