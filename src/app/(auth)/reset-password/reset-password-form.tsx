"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheck, GraduationCap, KeyRound, TriangleAlert } from "lucide-react";
import { resetPasswordAction } from "@/app/(auth)/actions";

const inputClass =
  "block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

export function ResetPasswordForm({ token, valid }: { token: string; valid: boolean }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) return setError("Your new password must be at least 8 characters.");
    if (newPassword !== confirmPassword) return setError("The two passwords don't match.");
    setSubmitting(true);
    setError("");
    const result = await resetPasswordAction({ token, newPassword, confirmPassword });
    setSubmitting(false);
    if (!result.success) return setError(result.error ?? "Something went wrong.");
    setDone(true);
  }

  const Icon = done ? CircleCheck : valid ? KeyRound : TriangleAlert;
  return (
    <div className="flex h-full w-full items-center justify-center p-lg">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex items-center justify-center gap-2">
          <GraduationCap className="text-secondary" size={28} />
          <span className="text-title-lg font-semibold text-primary">EduFlow</span>
        </div>
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg card-shadow">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
            <Icon size={22} aria-hidden />
          </div>
          {done ? (
            <>
              <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">Password changed</h1>
              <p className="mb-5 text-center text-body-md text-on-surface-variant">You&apos;ve been signed out on every device. Log in with your new password.</p>
              <Link href="/login" className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-label-md font-semibold text-on-secondary hover:bg-secondary/90">
                Go to Log In
              </Link>
            </>
          ) : !valid ? (
            <>
              <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">This link has expired</h1>
              <p className="mb-5 text-center text-body-md text-on-surface-variant">Reset links work once and only for an hour. Ask for a new one.</p>
              <Link href="/forgot-password" className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-label-md font-semibold text-on-secondary hover:bg-secondary/90">
                Send a New Link
              </Link>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">Choose a new password</h1>
              <p className="mb-5 text-center text-body-md text-on-surface-variant">At least 8 characters. You&apos;ll be signed out of every other device.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-password" className="block text-label-sm text-on-surface">
                    New password
                  </label>
                  <input id="new-password" type="password" autoComplete="new-password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="block text-label-sm text-on-surface">
                    Confirm new password
                  </label>
                  <input id="confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
                </div>
                {error && <p className="text-label-sm text-error">{error}</p>}
                <button type="submit" disabled={submitting} className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-label-md font-semibold text-on-secondary hover:bg-secondary/90 disabled:opacity-60">
                  {submitting ? "Saving…" : "Save New Password"}
                </button>
              </form>
            </>
          )}
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-label-md text-on-surface-variant transition-colors hover:text-primary">
            <ArrowLeft size={16} aria-hidden /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
