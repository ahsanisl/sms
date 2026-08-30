"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";
import { useSchoolProfile } from "@/lib/store/hooks";

/**
 * Full-screen, no sidebar/topbar — mirrors (auth)/layout.tsx's minimal shell.
 * Lives outside the (app) route group deliberately: AuthGuard (which wraps
 * every (app) route) redirects an unfinished School Owner here, so this
 * layout can't itself be caught by that same check.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const { schoolProfile } = useSchoolProfile();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "school_owner") {
      router.replace("/dashboard");
      return;
    }
    if (schoolProfile?.onboardingComplete) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, schoolProfile, router]);

  if (isLoading || !user || user.role !== "school_owner" || !schoolProfile || schoolProfile.onboardingComplete) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-on-surface-variant text-body-md">
        Loading EduFlow…
      </div>
    );
  }

  return <div className="h-screen w-full overflow-y-auto bg-background text-on-surface">{children}</div>;
}
