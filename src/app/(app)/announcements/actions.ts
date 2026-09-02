"use server";

import { revalidatePath } from "next/cache";
import * as announcementService from "@/services/announcement.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function deleteAnnouncementAction(announcementId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await announcementService.deleteAnnouncement(session, announcementId);
    revalidatePath("/announcements");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
