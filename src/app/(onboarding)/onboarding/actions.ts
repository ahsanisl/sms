"use server";

import * as schoolService from "@/services/school.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function completeOnboardingAction(): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await schoolService.completeOnboarding(session);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
