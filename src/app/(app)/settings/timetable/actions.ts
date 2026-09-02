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

export async function saveTimetableSettingsAction(
  workingDays: string[],
  periodsInput: { period: number; startTime: string; endTime: string }[],
  breakAfterPeriod: number,
): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await timetableService.setWorkingDays(session, workingDays);
    await timetableService.setPeriods(session, periodsInput, breakAfterPeriod);
    revalidatePath("/settings/timetable");
    revalidatePath("/timetable");
    revalidatePath("/timetable/builder");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
