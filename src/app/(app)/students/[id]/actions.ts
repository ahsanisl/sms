"use server";

import { revalidatePath } from "next/cache";
import * as studentService from "@/services/student.service";
import * as attendanceService from "@/services/attendance.service";
import * as accountService from "@/services/account.service";
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

// -- Parent logins (Owner / School Admin only — enforced in account.service) ------------------------

function accountErrorMessage(error: unknown): string {
  // A ZodError's .message is a JSON dump of every issue — show the first issue's own message instead.
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string }[] }).issues[0];
    if (issue?.message) return issue.message;
  }
  return errorMessage(error);
}

async function runParentAction(studentId: string, work: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await work();
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: accountErrorMessage(error) };
  }
}

export async function createParentAccountAction(studentId: string, input: unknown) {
  return runParentAction(studentId, async () => accountService.createParentAccount(await requireSession(), studentId, input));
}

export async function linkParentAccountAction(studentId: string, input: unknown) {
  return runParentAction(studentId, async () => accountService.linkParentAccount(await requireSession(), studentId, input));
}

export async function unlinkParentAccountAction(studentId: string, parentUserId: string) {
  return runParentAction(studentId, async () => accountService.unlinkParentAccount(await requireSession(), studentId, parentUserId));
}
