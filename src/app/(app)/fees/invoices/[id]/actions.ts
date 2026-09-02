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

export async function applyConcessionAction(invoiceId: string, studentId: string, input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.applyConcession(session, { ...(input as object), invoiceId, studentId });
    revalidatePath(`/fees/invoices/${invoiceId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function reversePaymentAction(invoiceId: string, paymentId: string, amount: number, reason: string, date: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await feeService.reversePayment(session, { paymentId, amount, reason, date });
    revalidatePath(`/fees/invoices/${invoiceId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
