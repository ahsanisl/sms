"use server";

import { revalidatePath } from "next/cache";
import * as timetableService from "@/services/timetable.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function saveDraftAction(classId: string, slots: unknown[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await timetableService.saveDraft(session, classId, slots);
    revalidatePath("/timetable/builder");
    revalidatePath("/timetable");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function discardDraftAction(classId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await timetableService.discardDraft(session, classId);
    revalidatePath("/timetable/builder");
    revalidatePath("/timetable");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function publishGridAction(classId: string, slots: unknown[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await timetableService.publishGrid(session, classId, slots);
    revalidatePath("/timetable/builder");
    revalidatePath("/timetable");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
