"use server";

import { revalidatePath } from "next/cache";
import * as leaveService from "@/services/leave.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function requestLeaveAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await leaveService.requestLeave(session, input);
    revalidatePath("/leave");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function reviewLeaveRequestAction(requestId: string, status: "approved" | "rejected", reviewNote?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await leaveService.reviewLeaveRequest(session, requestId, { status, reviewNote });
    revalidatePath("/leave");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
