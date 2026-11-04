import * as passwordResetService from "@/services/password-reset.service";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";

/** Landing page for the emailed reset link (?token=...). */
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = await passwordResetService.isResetTokenValid(token);
  return <ResetPasswordForm token={token} valid={valid} />;
}
