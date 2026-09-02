"use server";

import { revalidatePath } from "next/cache";
import * as admissionService from "@/services/admission.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function advanceInquiryStageAction(inquiryId: string, stage: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await admissionService.updateInquiryStage(session, inquiryId, stage);
    revalidatePath(`/admissions/${inquiryId}`);
    revalidatePath("/admissions");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function rejectInquiryAction(inquiryId: string, note?: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await admissionService.updateInquiryStage(session, inquiryId, "rejected", note);
    revalidatePath(`/admissions/${inquiryId}`);
    revalidatePath("/admissions");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function admitInquiryAction(inquiryId: string, studentInput: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await admissionService.convertInquiryToStudent(session, inquiryId, studentInput);
    revalidatePath("/admissions");
    revalidatePath("/students");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
