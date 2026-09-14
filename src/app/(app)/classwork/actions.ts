"use server";

import { revalidatePath } from "next/cache";
import * as classworkService from "@/services/classwork.service";
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
    date: String(formData.get("date") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  };
}

async function attachIfPresent(session: Awaited<ReturnType<typeof requireSession>>, classworkId: string, formData: FormData) {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    await classworkService.addAttachment(session, classworkId, file);
  }
}

export async function createClassworkAction(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const created = await classworkService.createClasswork(session, readInput(formData));
    await attachIfPresent(session, created.id, formData);
    revalidatePath("/classwork");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateClassworkAction(classworkId: string, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await classworkService.updateClasswork(session, classworkId, readInput(formData));
    await attachIfPresent(session, classworkId, formData);
    revalidatePath("/classwork");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function deleteClassworkAction(classworkId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await classworkService.deleteClasswork(session, classworkId);
    revalidatePath("/classwork");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
