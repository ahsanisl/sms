"use client";

import { useMemo, useState } from "react";
import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ShellContext } from "@/components/layout/shell-context";
import { usePersistedBoolean } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

/** Loaded server-side by the (app) layout — real campuses plus the switcher's current campus (see services/scope.ts's getViewCampusId). */
export interface TopbarCampusContext {
  campuses: { id: string; name: string }[];
  viewCampusId: string | null;
  sessionLabel: string | null;
}

export function AppShell({ children, campusContext }: { children: React.ReactNode; campusContext: TopbarCampusContext | null }) {
  const [collapsed, setCollapsed] = usePersistedBoolean("eduflow:sidebar-collapsed", false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const shell = useMemo(
    () => ({ collapsed, setCollapsed, mobileNavOpen, setMobileNavOpen, searchOpen, setSearchOpen }),
    [collapsed, setCollapsed, mobileNavOpen, searchOpen],
  );

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-screen overflow-hidden bg-background text-on-surface">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-secondary focus:px-4 focus:py-2 focus:text-on-secondary"
        >
          Skip to content
        </a>
        <Sidebar />
        <MobileSidebar />
        <div className={cn("flex-1 flex flex-col h-screen overflow-hidden min-w-0 transition-[margin] duration-200 motion-reduce:transition-none", collapsed ? "md:ml-[72px]" : "md:ml-64")}>
          <Topbar campusContext={campusContext} />
          <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto px-md py-lg sm:px-lg lg:p-xl focus:outline-none">
            <div className="max-w-[1440px] mx-auto">{children}</div>
          </main>
        </div>
        <CommandPalette />
      </div>
    </ShellContext.Provider>
  );
}
