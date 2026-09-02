"use server";

import * as feeService from "@/services/fee.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
  invoiceId?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function recordPaymentAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const payment = await feeService.recordPayment(session, input);
    return { success: true, invoiceId: payment.invoiceId };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
