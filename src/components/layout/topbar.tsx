"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGlobalLoading, useGlobalTransition, useLoadingRouter } from "@/components/layout/global-loader";
import { Search, Bell, ChevronDown, LogOut, Settings, Check, Menu, Building2, UserRound } from "lucide-react";
import { Avatar } from "@/components/shared/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/session-context";
import { allows, usePermissions } from "@/lib/auth/permissions-context";
import { ROLE_LABEL } from "@/lib/nav-config";
import { canSwitchCampus } from "@/lib/campus-scope";
import { notificationIdsAction, setViewCampusAction } from "@/app/(app)/actions";
import { useReadNotifications } from "@/lib/notification-read-state";
import { useShell } from "@/components/layout/shell-context";
import type { TopbarCampusContext } from "@/components/layout/app-shell";

const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary";

export function Topbar({ campusContext }: { campusContext: TopbarCampusContext | null }) {
  const { user, logout } = useSession();
  const perms = usePermissions();
  const { setMobileNavOpen, setSearchOpen } = useShell();
  const router = useLoadingRouter();
  const runGlobal = useGlobalTransition();
  const isLoading = useGlobalLoading();

  if (!user) return null;
  const switchable = canSwitchCampus(user.role);
  const campuses = campusContext?.campuses ?? [];
  const viewCampusId = campusContext?.viewCampusId ?? null;
  const sessionLabel = campusContext?.sessionLabel ?? null;
  const campusLabel = (campusId: string | null | undefined) => (campusId ? (campuses.find((c) => c.id === campusId)?.name ?? "Campus") : "All Campuses");
  const canOpenSettings = allows(perms, "settings");

  function switchCampus(campusId: string | null) {
    if (campusId === viewCampusId) return;
    // Global transition: the top progress bar stays up until the newly scoped data has rendered.
    runGlobal(async () => {
      const result = await setViewCampusAction(campusId);
      if (result.success) toast.success(`Now viewing ${campusLabel(campusId)}`);
      else toast.error(result.error ?? "Couldn't switch campus.");
    });
  }

  async function handleLogout() {
    // Clear the switcher cookie so the next account on this browser starts on "All Campuses".
    if (switchable && viewCampusId) await setViewCampusAction(null);
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-2 border-b border-outline-variant/70 bg-surface-container-lowest/90 px-md backdrop-blur supports-[backdrop-filter]:bg-surface-container-lowest/75 sm:px-lg">
      <button type="button" className={`${iconButton} -ml-2 md:hidden`} onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group hidden h-9 w-full max-w-[28rem] items-center gap-3 rounded-full border border-outline-variant bg-surface-container-low px-4 text-left text-body-md text-on-surface-variant transition-colors hover:border-secondary/50 hover:bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-secondary sm:flex"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">Search students, teachers, classes…</span>
        <kbd className="rounded border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 font-sans text-[10px] text-on-surface-variant">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <button type="button" className={`${iconButton} sm:hidden`} onClick={() => setSearchOpen(true)} aria-label="Search">
          <Search className="h-5 w-5" />
        </button>

        {campusContext && switchable && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isLoading}
              className="flex h-9 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 transition-colors hover:bg-surface-container-low outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-60"
              aria-label={`Viewing ${campusLabel(viewCampusId)}. Switch campus`}
            >
              <Building2 className="h-4 w-4 text-secondary" />
              <span className="hidden max-w-[12rem] truncate text-label-md font-semibold text-on-surface lg:inline">{campusLabel(viewCampusId)}</span>
              {sessionLabel && <span className="hidden rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant xl:inline">{sessionLabel}</span>}
              <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel>View campus</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => switchCampus(null)}>
                <Check className={`h-4 w-4 ${!viewCampusId ? "opacity-100" : "opacity-0"}`} />
                All Campuses
              </DropdownMenuItem>
              {campuses.map((campus) => (
                <DropdownMenuItem key={campus.id} onClick={() => switchCampus(campus.id)}>
                  <Check className={`h-4 w-4 ${viewCampusId === campus.id ? "opacity-100" : "opacity-0"}`} />
                  {campus.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {campusContext && !switchable && (
          <div className="hidden h-9 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 md:flex">
            <Building2 className="h-4 w-4 text-secondary" />
            <span className="max-w-[12rem] truncate text-label-md font-semibold text-on-surface">{campusLabel(user.campusId)}</span>
            {sessionLabel && <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">{sessionLabel}</span>}
          </div>
        )}

        <NotificationBell userId={user.id} />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:rounded-lg lg:py-1 lg:pl-1 lg:pr-2 lg:hover:bg-surface-container-low" aria-label="Account menu">
            <Avatar name={user.name} />
            <span className="hidden text-left lg:block">
              <span className="block max-w-[10rem] truncate text-label-md font-semibold text-on-surface">{user.name}</span>
              <span className="block text-label-sm text-on-surface-variant">{perms?.roleName ?? ROLE_LABEL[user.role]}</span>
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-on-surface-variant lg:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            <DropdownMenuLabel>
              <div className="flex flex-col normal-case tracking-normal">
                <span className="font-semibold text-on-surface">{user.name}</span>
                <span className="font-normal text-on-surface-variant">{user.email}</span>
                <span className="mt-1 font-normal text-on-surface-variant">{perms?.roleName ?? ROLE_LABEL[user.role]}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserRound className="h-4 w-4" /> My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications">
                <Bell className="h-4 w-4" /> Notifications
              </Link>
            </DropdownMenuItem>
            {canOpenSettings && (
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/** Refetch the derived notification list at most this often while the tab stays open. */
const NOTIFICATION_REFRESH_MS = 5 * 60 * 1000;

/** Bell with a real unread count: current notification ids from the server, minus the ones this user has read (lib/notification-read-state.ts). */
function NotificationBell({ userId }: { userId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [readIds] = useReadNotifications(userId);

  useEffect(() => {
    let cancelled = false;
    let lastFetch = 0;
    function load() {
      if (Date.now() - lastFetch < NOTIFICATION_REFRESH_MS) return;
      lastFetch = Date.now();
      notificationIdsAction()
        .then((next) => {
          if (!cancelled) setIds(next);
        })
        .catch(() => {});
    }
    load();
    const timer = window.setInterval(load, NOTIFICATION_REFRESH_MS);
    window.addEventListener("focus", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [userId]);

  const unread = ids.filter((id) => !readIds.has(id)).length;
  const label = unread ? `Notifications, ${unread} unread` : "Notifications";
  return (
    <Link href="/notifications" className={`${iconButton} relative`} aria-label={label} title={label}>
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span aria-hidden className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error ring-2 ring-surface-container-lowest">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
