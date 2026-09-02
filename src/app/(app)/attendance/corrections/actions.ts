"use server";

import { revalidatePath } from "next/cache";
import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function approveCorrectionAction(correctionId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await attendanceService.reviewCorrection(session, correctionId, "approved");
    revalidatePath("/attendance/corrections");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function rejectCorrectionAction(correctionId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await attendanceService.reviewCorrection(session, correctionId, "rejected");
    revalidatePath("/attendance/corrections");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
