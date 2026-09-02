"use server";

import { revalidatePath } from "next/cache";
import * as sessionService from "@/services/academic-session.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createSessionAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await sessionService.createSession(session, input);
    revalidatePath("/settings/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateSessionAction(sessionId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await sessionService.updateSession(session, sessionId, input);
    revalidatePath("/settings/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function setActiveSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await sessionService.setActiveSession(session, sessionId);
    revalidatePath("/settings/sessions");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
