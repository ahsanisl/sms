"use server";

import { revalidatePath } from "next/cache";
import * as roomService from "@/services/room.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createRoomAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await roomService.createRoom(session, input);
    revalidatePath("/settings/rooms");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateRoomAction(roomId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await roomService.updateRoom(session, roomId, input);
    revalidatePath("/settings/rooms");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveRoomAction(roomId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await roomService.archiveRoom(session, roomId);
    revalidatePath("/settings/rooms");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
