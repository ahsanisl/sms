"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session-context";
import { isAlwaysAllowed, isParentOnlyRoute, moduleForPath } from "@/lib/permissions";
import type { PermissionModule } from "@/lib/types";

interface PermissionsResponse {
  permissions: Partial<Record<PermissionModule, boolean>>;
  onboardingComplete: boolean | null;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const lastDeniedPath = useRef<string | null>(null);
  const [perms, setPerms] = useState<PermissionsResponse | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Real, DB-backed permission matrix — fetched once per signed-in session
  // via the one client-fetchable window into it (can()/requirePermission()
  // are server-only, so a plain hook can't read them directly). Every real
  // mutation is independently guarded server-side regardless of this; this
  // is only the client-side redirect for a snappier UX than waiting for a
  // page to load and then error. Keyed on the user's id (a stable primitive)
  // rather than the user object itself, which SessionBridge reconstructs
  // fresh on every render — depending on the object would refetch far more
  // often than "once per signed-in session."
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me/permissions")
      .then((res) => (res.ok ? (res.json() as Promise<PermissionsResponse>) : null))
      .then((data) => {
        if (!cancelled) setPerms(data ?? { permissions: {}, onboardingComplete: null });
      })
      .catch(() => {
        if (!cancelled) setPerms({ permissions: {}, onboardingComplete: null });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!user || !perms) return;

    // A School Owner whose school hasn't finished the setup wizard can't reach
    // any (app) route — /onboarding lives outside this route group entirely,
    // so it isn't caught by this same check. onboardingComplete is only ever
    // set (non-null) for a school_owner session.
    if (user.role === "school_owner" && perms.onboardingComplete === false) {
      router.replace("/onboarding");
      return;
    }

    if (isParentOnlyRoute(pathname) && user.role !== "parent") {
      if (lastDeniedPath.current !== pathname) {
        lastDeniedPath.current = pathname;
        toast.error("That page is only available to parent accounts.");
      }
      router.replace("/dashboard");
      return;
    }

    if (isAlwaysAllowed(pathname)) return;

    const routeModule = moduleForPath(pathname);
    if (routeModule && !perms.permissions[routeModule]) {
      if (lastDeniedPath.current !== pathname) {
        lastDeniedPath.current = pathname;
        toast.error("Your role doesn't have access to that page.");
      }
      router.replace("/dashboard");
    }
  }, [user, pathname, perms, router]);

  if (isLoading || !user || !perms) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-on-surface-variant text-body-md">
        Loading EduFlow…
      </div>
    );
  }

  return <>{children}</>;
}
