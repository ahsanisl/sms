"use server";

import * as admissionService from "@/services/admission.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createInquiryAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await admissionService.createInquiry(session, input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
