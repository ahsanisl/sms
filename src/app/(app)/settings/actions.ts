"use server";

import { revalidatePath } from "next/cache";
import * as schoolService from "@/services/school.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function updateSchoolProfileAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await schoolService.updateMySchoolProfile(session, input);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
