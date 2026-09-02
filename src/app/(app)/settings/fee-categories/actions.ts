"use server";

import { revalidatePath } from "next/cache";
import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createFeeCategoryAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.createCategory(session, input);
    revalidatePath("/settings/fee-categories");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function updateFeeCategoryAction(categoryId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.updateCategory(session, categoryId, input);
    revalidatePath("/settings/fee-categories");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function archiveFeeCategoryAction(categoryId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.archiveCategory(session, categoryId);
    revalidatePath("/settings/fee-categories");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
