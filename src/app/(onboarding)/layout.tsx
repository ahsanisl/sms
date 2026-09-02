/**
 * Full-screen, no sidebar/topbar — mirrors (auth)/layout.tsx's minimal shell.
 * Lives outside the (app) route group deliberately: AuthGuard (which wraps
 * every (app) route) redirects an unfinished School Owner here, so this
 * layout can't itself be caught by that same check.
 *
 * All the actual gating (must be signed in, must be a school_owner, must not
 * have already finished onboarding) now happens server-side in
 * onboarding/page.tsx via requireSession() + redirect() — this layout used
 * to do that itself client-side against the mock AppDataProvider store, but
 * that meant a school that only ever existed in Postgres (created through
 * the real Platform Admin console) had no matching mock record, so the old
 * check's `!schoolProfile` branch never resolved and this route was a
 * permanent "Loading EduFlow…" dead end for its owner. Plain server-rendered
 * markup here has no such gap.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-full overflow-y-auto bg-background text-on-surface">{children}</div>;
}
