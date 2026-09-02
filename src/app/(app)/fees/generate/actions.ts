"use server";

import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
  count?: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function generateInvoicesAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const created = await feeService.generateInvoices(session, input);
    return { success: true, count: created.length };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
