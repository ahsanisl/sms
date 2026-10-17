"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, Settings, User, Check } from "lucide-react";
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
import { ROLE_LABEL } from "@/lib/nav-config";
import { canSwitchCampus } from "@/lib/campus-scope";
import { setViewCampusAction } from "@/app/(app)/actions";
import type { TopbarCampusContext } from "@/components/layout/app-shell";

export function Topbar({ campusContext }: { campusContext: TopbarCampusContext | null }) {
  const { user, logout } = useSession();
  const router = useRouter();
  const [isSwitching, startSwitching] = useTransition();

  if (!user) return null;
  const switchable = canSwitchCampus(user.role);
  const campuses = campusContext?.campuses ?? [];
  const viewCampusId = campusContext?.viewCampusId ?? null;
  const sessionSuffix = campusContext?.sessionLabel ? ` · ${campusContext.sessionLabel}` : "";
  const campusLabel = (campusId: string | null | undefined) => (campusId ? (campuses.find((c) => c.id === campusId)?.name ?? "Campus") : "All Campuses");

  function switchCampus(campusId: string | null) {
    if (campusId === viewCampusId) return;
    startSwitching(async () => {
      const result = await setViewCampusAction(campusId);
      if (!result.success) toast.error(result.error ?? "Couldn't switch campus.");
    });
  }

  async function handleLogout() {
    // Clear the switcher cookie so the next account on this browser starts on "All Campuses".
    if (switchable && viewCampusId) await setViewCampusAction(null);
    logout();
    router.push("/login");
  }

  return (
    <header className="flex justify-between items-center px-lg py-sm sticky top-0 z-30 bg-surface w-full h-16 border-b border-outline-variant shadow-sm">
      <div className="flex-1 max-w-[36rem]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-on-surface-variant" />
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-body-md focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            placeholder="Search students, faculty, or reports…"
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4">
        {campusContext && switchable && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isSwitching}
              className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-md border border-outline-variant hover:bg-surface-container-high transition-colors outline-none disabled:opacity-60"
            >
              <span className="text-label-md text-on-surface-variant">
                {isSwitching ? "Switching…" : `${campusLabel(viewCampusId)}${sessionSuffix}`}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Campus</DropdownMenuLabel>
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
          <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-md border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">
              {campusLabel(user.campusId)}
              {sessionSuffix}
            </span>
          </div>
        )}
        <Link
          href="/notifications"
          className="text-on-surface-variant hover:text-primary p-2 hover:bg-surface-container-low rounded-full transition-colors relative"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar name={user.name} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface">{user.name}</span>
                <span className="text-on-surface-variant normal-case font-normal">{ROLE_LABEL[user.role]}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
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
