"use server";

import { revalidatePath } from "next/cache";
import * as teacherService from "@/services/teacher.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createTeacherAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await teacherService.createTeacher(session, input);
    revalidatePath("/teachers");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateTeacherAction(teacherId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await teacherService.updateTeacher(session, teacherId, input);
    revalidatePath("/teachers");
    revalidatePath(`/teachers/${teacherId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteTeacherAction(teacherId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await teacherService.deleteTeacher(session, teacherId);
    revalidatePath("/teachers");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
