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

export async function createStructureItemAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.createStructureItem(session, input);
    revalidatePath("/fees/structure");
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
