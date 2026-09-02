"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/shared/icon";
import { FOOTER_NAV, navForRole, ROLE_LABEL, type NavItem } from "@/lib/nav-config";
import { useSession } from "@/lib/auth/session-context";
import { moduleForPath } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { PermissionModule } from "@/lib/types";

interface PermissionsResponse {
  permissions: Partial<Record<PermissionModule, boolean>>;
  schoolName: string | null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useSession();
  const [perms, setPerms] = useState<PermissionsResponse | null>(null);
  const userId = user?.id;

  // Same real, DB-backed source AuthGuard reads (see that component's own
  // note) — nav-link visibility is cosmetic, not the access boundary, but it
  // should still reflect what the role can actually reach rather than the
  // mock store's separately-editable copy.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch("/api/me/permissions")
      .then((res) => (res.ok ? (res.json() as Promise<PermissionsResponse>) : null))
      .then((data) => {
        if (!cancelled) setPerms(data);
      })
      .catch(() => {
        if (!cancelled) setPerms(null);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!user) return null;

  const isVisible = (item: NavItem) => {
    const routeModule = moduleForPath(item.href);
    return !routeModule || perms?.permissions[routeModule] !== false;
  };

  const navItems = navForRole(user.role).filter(isVisible);
  const footerItems = FOOTER_NAV.filter(isVisible);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary text-on-primary flex-col py-md px-sm border-r border-outline-variant z-20 hidden md:flex">
      <div className="mb-xl px-md flex items-center gap-md">
        <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
          <Icon name="school" className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-headline-sm font-bold text-on-primary">EduFlow</h1>
          <p className="text-label-sm text-primary-fixed-dim">
            {ROLE_LABEL[user.role]}
            {perms?.schoolName ? ` · ${perms.schoolName}` : ""}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Primary">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-md px-md py-3 rounded-lg text-label-md transition-colors",
                active
                  ? "bg-secondary-container text-on-secondary-container font-bold shadow-sm"
                  : "text-on-primary-container hover:bg-primary-container/70 hover:text-on-primary",
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-md border-t border-primary-container/60 space-y-1">
        {footerItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-md px-md py-3 rounded-lg text-label-md transition-colors",
                active
                  ? "bg-secondary-container text-on-secondary-container font-bold shadow-sm"
                  : "text-on-primary-container hover:bg-primary-container/70 hover:text-on-primary",
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => toast.info("Support chat isn't available in this preview.")}
          className="w-full flex items-center gap-md px-md py-3 rounded-lg text-label-md text-on-primary-container hover:bg-primary-container/70 hover:text-on-primary transition-colors"
        >
          <Icon name="help" className="h-5 w-5" />
          Support
        </button>
      </div>
    </aside>
  );
}
