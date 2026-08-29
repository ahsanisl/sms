"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session-context";
import { usePermissions } from "@/lib/store/hooks";
import { isAlwaysAllowed, isParentOnlyRoute, moduleForPath } from "@/lib/permissions";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSession();
  const { routePermissions } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const lastDeniedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;

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
    if (routeModule && !routePermissions[user.role]?.[routeModule]) {
      if (lastDeniedPath.current !== pathname) {
        lastDeniedPath.current = pathname;
        toast.error("Your role doesn't have access to that page.");
      }
      router.replace("/dashboard");
    }
  }, [user, pathname, routePermissions, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-on-surface-variant text-body-md">
        Loading EduFlow…
      </div>
    );
  }

  return <>{children}</>;
}
