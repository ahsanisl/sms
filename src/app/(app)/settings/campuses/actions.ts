"use server";

import { revalidatePath } from "next/cache";
import * as campusService from "@/services/campus.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createCampusAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await campusService.createCampus(session, input);
    revalidatePath("/settings/campuses");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateCampusAction(campusId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await campusService.updateCampus(session, campusId, input);
    revalidatePath("/settings/campuses");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveCampusAction(campusId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await campusService.archiveCampus(session, campusId);
    revalidatePath("/settings/campuses");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
