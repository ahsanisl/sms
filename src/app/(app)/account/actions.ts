"use server";

import * as accountService from "@/services/account.service";
import { requireSession } from "@/lib/tenancy";

interface ActionResult {
  success: boolean;
  error?: string;
}

function errorMessage(error: unknown): string {
  // A ZodError's .message is a JSON dump of every issue — show the first issue's own message instead.
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const issue = (error as { issues: { message?: string }[] }).issues[0];
    if (issue?.message) return issue.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function changeOwnPasswordAction(input: unknown): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await accountService.changeOwnPassword(session, input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
