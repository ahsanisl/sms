"use server";

import { revalidatePath } from "next/cache";
import * as payrollService from "@/services/payroll.service";
import { requireSession, type AuthSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const first = (error as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

async function run(fn: (session: AuthSession) => Promise<{ id?: string } | unknown>): Promise<ActionResult> {
  try {
    const result = await fn(await requireSession());
    revalidatePath("/payroll", "layout");
    revalidatePath("/finance");
    revalidatePath("/dashboard");
    const id = result && typeof result === "object" && "id" in result && typeof result.id === "string" ? result.id : undefined;
    return { success: true, id };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function createProfileAction(input: unknown) {
  return run((session) => payrollService.createProfile(session, input));
}

export async function updateProfileAction(profileId: string, input: unknown) {
  return run((session) => payrollService.updateProfile(session, profileId, input));
}

export async function setProfileArchivedAction(profileId: string, archived: boolean) {
  return run((session) => payrollService.setProfileArchived(session, profileId, archived));
}

export async function createRunAction(month: string) {
  return run((session) => payrollService.createRun(session, { month }));
}

export async function adjustPayslipAction(payslipId: string, input: unknown) {
  return run((session) => payrollService.adjustPayslip(session, payslipId, input));
}

export async function finalizeRunAction(runId: string) {
  return run((session) => payrollService.finalizeRun(session, runId));
}

export async function deleteRunAction(runId: string) {
  return run((session) => payrollService.deleteRun(session, runId));
}

export async function markPaidAction(runId: string, input: unknown) {
  return run((session) => payrollService.markPaid(session, runId, input));
}
