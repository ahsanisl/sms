"use server";

import * as attendanceService from "@/services/attendance.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function markAttendanceAction(entries: unknown[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await attendanceService.markAttendanceBulk(session, entries);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
