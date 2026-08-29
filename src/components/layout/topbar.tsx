"use client";

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
import { useSession } from "@/lib/auth/session-context";
import { ROLE_LABEL } from "@/lib/nav-config";
import { useCampuses } from "@/lib/store/hooks";
import { canSwitchCampus } from "@/lib/campus-scope";
import { campusName } from "@/lib/mock";

export function Topbar() {
  const { user, logout, viewCampusId, setViewCampusId } = useSession();
  const { campuses } = useCampuses();
  const router = useRouter();

  if (!user) return null;
  const isAdmin = user.role === "school_admin" || user.role === "campus_admin" || user.role === "school_owner" || user.role === "accountant";
  const switchable = canSwitchCampus(user.role);
  const activeCampuses = campuses.filter((c) => c.status === "active");

  function handleLogout() {
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
        {isAdmin && switchable && (
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-md border border-outline-variant hover:bg-surface-container-high transition-colors outline-none">
              <span className="text-label-md text-on-surface-variant">
                {viewCampusId ? campusName(viewCampusId) : "All Campuses"} · 2026-27
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Campus</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setViewCampusId(null)}>
                <Check className={`h-4 w-4 ${!viewCampusId ? "opacity-100" : "opacity-0"}`} />
                All Campuses
              </DropdownMenuItem>
              {activeCampuses.map((campus) => (
                <DropdownMenuItem key={campus.id} onClick={() => setViewCampusId(campus.id)}>
                  <Check className={`h-4 w-4 ${viewCampusId === campus.id ? "opacity-100" : "opacity-0"}`} />
                  {campus.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isAdmin && !switchable && (
          <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-md border border-outline-variant">
            <span className="text-label-md text-on-surface-variant">
              {user.campusId ? campusName(user.campusId) : "All Campuses"} · 2026-27
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
