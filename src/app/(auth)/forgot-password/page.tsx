"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-lg">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <GraduationCap className="text-secondary" size={28} />
          <span className="text-title-lg font-semibold text-primary">EduFlow</span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg card-shadow">
          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-secondary-container/20 flex items-center justify-center text-secondary">
                <MailCheck size={24} />
              </div>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-2">Check your email</h2>
              <p className="text-body-md text-on-surface-variant mb-6">
                If an account exists for <span className="font-semibold">{email}</span>, we&apos;ve sent
                password reset instructions (this is a prototype — no email is actually sent).
              </p>
              <Link href="/login" className="text-label-md text-secondary hover:underline">
                Back to log in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-headline-sm font-semibold text-on-surface mb-2">Reset your password</h2>
              <p className="text-body-md text-on-surface-variant mb-6">
                Enter the email associated with your account and we&apos;ll send a reset link.
              </p>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="block text-label-sm text-on-surface" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.edu"
                    className="block w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:ring-1 focus:ring-secondary focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full justify-center items-center rounded-lg bg-secondary px-4 py-3 text-label-md font-semibold text-on-secondary shadow-sm hover:bg-secondary/90 transition-all"
                >
                  Send reset link
                </button>
              </form>
              <Link
                href="/login"
                className="mt-6 flex items-center gap-1.5 justify-center text-label-md text-on-surface-variant hover:text-primary transition-colors"
              >
                <ArrowLeft size={16} /> Back to log in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
