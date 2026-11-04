import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as authRepo from "@/repositories/auth.repository";
import * as userRepo from "@/repositories/users.repository";
import { escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { logAuditForUser } from "@/services/audit.service";

/**
 * "Forgot password?" by email. The link carries a random token; only its
 * SHA-256 hash is stored (auth_verifications), it works once, and it
 * expires after an hour. Using it sets the new password, clears any sign-in
 * lockout, and signs the account out of every device.
 *
 * Never reveals whether an email has an account: the request always "succeeds".
 */
const TOKEN_MINUTES = 60;
/** One email per account per minute — stops the form being used to flood someone's inbox. */
const RESEND_COOLDOWN_MS = 60_000;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const RequestSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address.") });
export const ResetPasswordSchema = z
  .object({
    token: z.string().min(20, "This reset link is incomplete. Open the link from your email again."),
    newPassword: z.string().min(8, "Your new password must be at least 8 characters.").max(200),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "The two passwords don't match.", path: ["confirmPassword"] });

export async function requestPasswordReset(input: unknown, appUrl: string): Promise<{ emailConfigured: boolean }> {
  const { email } = RequestSchema.parse(input);
  const user = await userRepo.findUserByEmail(email);
  if (user) {
    const previous = await authRepo.latestPasswordResetRequest(user.id);
    if (!previous || Date.now() - previous.createdAt.getTime() > RESEND_COOLDOWN_MS) {
      const token = randomBytes(32).toString("base64url");
      await authRepo.replacePasswordResetToken(user.id, hashToken(token), new Date(Date.now() + TOKEN_MINUTES * 60_000));
      const link = `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Reset your EduFlow password",
        text: `Hi ${user.name},\n\nSomeone (hopefully you) asked to reset the password for your EduFlow account.\n\nChoose a new password here (the link works once and expires in ${TOKEN_MINUTES} minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email — your password stays the same.`,
        html: `<p>Hi ${escapeHtml(user.name)},</p><p>Someone (hopefully you) asked to reset the password for your EduFlow account.</p><p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;background:#4648d4;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Choose a new password</a></p><p style="color:#45474c;font-size:13px">The link works once and expires in ${TOKEN_MINUTES} minutes. If you didn't ask for this, you can ignore this email — your password stays the same.</p>`,
      });
      await logAuditForUser(user, "user.password_reset_requested", "User", user.id);
    }
  }
  return { emailConfigured: isEmailConfigured() };
}

/** Checks a reset link before showing the form, so an expired link says so straight away. */
export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  return !!(await authRepo.findPasswordResetToken(hashToken(token)));
}

export async function resetPasswordWithToken(input: unknown) {
  const data = ResetPasswordSchema.parse(input);
  const match = await authRepo.findPasswordResetToken(hashToken(data.token));
  if (!match) throw new Error("This reset link has expired or was already used. Ask for a new one.");
  await userRepo.setPassword(match.userId, await bcrypt.hash(data.newPassword, 12), false);
  await authRepo.deletePasswordResetTokens(match.userId);
  const signedOut = await authRepo.deleteSessionsForUser(match.userId);
  const user = await userRepo.findUserById(match.userId);
  if (user) await logAuditForUser(user, "user.password_reset_by_email", "User", user.id, { sessionsEnded: signedOut });
}
