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

function readInput(formData: FormData) {
  return {
    classId: String(formData.get("classId") ?? ""),
    subjectId: String(formData.get("subjectId") ?? ""),
    teacherId: formData.get("teacherId") ? String(formData.get("teacherId")) : undefined,
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    assignedDate: String(formData.get("assignedDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
  };
}

export async function createHomeworkAction(formData: FormData): Promise<ActionResult & { id?: string }> {
  try {
    const session = await requireSession();
    const created = await homeworkService.createHomework(session, readInput(formData));
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      await homeworkService.addAttachment(session, created.id, file);
    }
    revalidatePath("/homework");
    return { success: true, id: created.id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateHomeworkAction(homeworkId: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await homeworkService.updateHomework(session, homeworkId, readInput(formData));
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      await homeworkService.addAttachment(session, homeworkId, file);
    }
    revalidatePath("/homework");
    revalidatePath(`/homework/${homeworkId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteHomeworkAction(homeworkId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await homeworkService.deleteHomework(session, homeworkId);
    revalidatePath("/homework");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function gradeSubmissionAction(submissionId: string, grade: string, teacherComment: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await homeworkService.gradeSubmission(session, submissionId, { grade, teacherComment });
    revalidatePath("/homework");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
