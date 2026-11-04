"use server";

import { headers } from "next/headers";
import { clientIp, isIpBlocked, recordIpFailure } from "@/lib/login-throttle";
import * as passwordResetService from "@/services/password-reset.service";

interface ActionResult {
  success: boolean;
  error?: string;
  emailConfigured?: boolean;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray((error as { issues: unknown[] }).issues)) {
    const first = (error as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Where reset links point: the configured public URL, or else the address this request came in on. */
async function appUrl() {
  const configured = process.env.BETTER_AUTH_URL ?? process.env.AUTH_URL;
  if (configured) return configured;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export async function requestPasswordResetAction(email: string): Promise<ActionResult> {
  try {
    // Shares the sign-in per-IP limit, so the form can't be used to probe or spam at volume.
    const ip = clientIp(await headers());
    if (isIpBlocked(ip)) return { success: false, error: "Too many attempts. Please wait 15 minutes and try again." };
    recordIpFailure(ip);
    const { emailConfigured } = await passwordResetService.requestPasswordReset({ email }, await appUrl());
    return { success: true, emailConfigured };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function resetPasswordAction(input: { token: string; newPassword: string; confirmPassword: string }): Promise<ActionResult> {
  try {
    await passwordResetService.resetPasswordWithToken(input);
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}
