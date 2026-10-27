"use server";

import { revalidatePath } from "next/cache";
import * as auditService from "@/services/audit.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function setRetentionDaysAction(days: number | null): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await auditService.setRetentionDays(session, days);
    revalidatePath("/audit-log");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function cleanUpNowAction(): Promise<ActionResult & { deletedCount?: number }> {
  try {
    const session = await requireSession();
    const deletedCount = await auditService.cleanUpNow(session);
    revalidatePath("/audit-log");
    return { success: true, deletedCount };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
