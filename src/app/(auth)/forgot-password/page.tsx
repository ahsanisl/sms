"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GraduationCap, KeyRound, MailCheck } from "lucide-react";
import { requestPasswordResetAction } from "@/app/(auth)/actions";

/**
 * "Forgot password?": emails a one-time reset link (services/password-reset.service.ts).
 * The response is the same whether or not the email has an account. If the
 * server has no email provider configured, the page also points people to
 * the school office, which can reset passwords from Users & Roles.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ emailConfigured: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await requestPasswordResetAction(email);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    setSent({ emailConfigured: !!result.emailConfigured });
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-lg">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex items-center justify-center gap-2">
          <GraduationCap className="text-secondary" size={28} />
          <span className="text-title-lg font-semibold text-primary">EduFlow</span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg card-shadow">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
            {sent ? <MailCheck size={22} aria-hidden /> : <KeyRound size={22} aria-hidden />}
          </div>
          {sent ? (
            <>
              <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">Check your email</h1>
              <p className="text-center text-body-md text-on-surface-variant">
                If <span className="font-semibold text-on-surface">{email}</span> has an EduFlow account, we&apos;ve sent it a link to choose a new password. The link expires in one hour.
              </p>
              <p className="mt-3 text-center text-label-md text-on-surface-variant">
                {sent.emailConfigured ? "Nothing after a few minutes? Check your spam folder, or ask" : "Didn't get it? Ask"} your school office — they can give you a temporary password from Settings → Users &amp; Roles.
              </p>
            </>
          ) : (
            <>
              <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">Forgot your password?</h1>
              <p className="mb-5 text-center text-body-md text-on-surface-variant">Enter your email and we&apos;ll send you a link to choose a new one.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-label-sm text-on-surface">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                </div>
                {error && <p className="text-label-sm text-error">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center rounded-lg bg-secondary px-4 py-2.5 text-label-md font-semibold text-on-secondary transition-all hover:bg-secondary/90 disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
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
