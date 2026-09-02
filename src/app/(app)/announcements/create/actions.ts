"use server";

import * as announcementService from "@/services/announcement.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createAnnouncementAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await announcementService.createAnnouncement(session, input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
