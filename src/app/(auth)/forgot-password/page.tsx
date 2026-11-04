import Link from "next/link";
import { GraduationCap, ArrowLeft, KeyRound } from "lucide-react";

/**
 * EduFlow has no email service, so there's no self-service reset link.
 * Passwords are reset by the school: an Owner or School Admin issues a
 * temporary password from Settings → Users & Roles, and the user chooses
 * their own at next sign-in (see services/account.service.ts). Emailed reset
 * links need an email provider to be configured first.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="flex h-full w-full items-center justify-center p-lg">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex items-center justify-center gap-2">
          <GraduationCap className="text-secondary" size={28} />
          <span className="text-title-lg font-semibold text-primary">EduFlow</span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg card-shadow">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
            <KeyRound size={22} aria-hidden />
          </div>
          <h1 className="mb-2 text-center text-headline-sm font-semibold text-on-surface">Forgot your password?</h1>
          <p className="mb-5 text-center text-body-md text-on-surface-variant">Your school resets passwords for you — it only takes a minute.</p>
          <ol className="space-y-3 text-body-md text-on-surface">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-label-sm font-bold text-on-secondary">1</span>
              <span>Contact your school office, or your school&apos;s Owner or Admin.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-label-sm font-bold text-on-secondary">2</span>
              <span>They&apos;ll give you a temporary password (from Settings → Users &amp; Roles).</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-label-sm font-bold text-on-secondary">3</span>
              <span>Sign in with it — you&apos;ll then choose a new password of your own.</span>
            </li>
          </ol>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-label-md text-on-surface-variant transition-colors hover:text-primary">
            <ArrowLeft size={16} aria-hidden /> Back to log in
          </Link>
        </div>
      </div>
    </div>
  );
}
