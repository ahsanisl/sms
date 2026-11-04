"use client";

import { useMemo } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronDown, ChevronsLeft, ChevronsRight, Loader2, Search, X } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { Avatar } from "@/components/shared/avatar";
import { useShell } from "@/components/layout/shell-context";
import { activeNavHref, navGroupsForRole, ROLE_LABEL, type NavGroup } from "@/lib/nav-config";
import { useSession } from "@/lib/auth/session-context";
import { allows, usePermissions } from "@/lib/auth/permissions-context";
import { moduleForPath } from "@/lib/permissions";
import { usePersistedString } from "@/lib/use-persisted-state";
import { cn } from "@/lib/utils";

/** The signed-in role's nav groups, with every item the live permission matrix denies removed (and empty groups dropped). */
export function useVisibleNav(): NavGroup[] {
  const { user } = useSession();
  const perms = usePermissions();
  return useMemo(() => {
    if (!user) return [];
    return navGroupsForRole(user.role)
      .map((group) => ({ ...group, items: group.items.filter((item) => allows(perms, moduleForPath(item.href))) }))
      .filter((group) => group.items.length > 0);
  }, [user, perms]);
}

/** Desktop sidebar — full width with collapsible groups, or a narrow icon rail (w-16). */
export function Sidebar() {
  const { collapsed, setCollapsed } = useShell();
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-20 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex",
        "transition-[width] duration-200 motion-reduce:transition-none",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <div className={cn("border-t border-sidebar-border p-sm", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-label-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-on-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed-dim",
            !collapsed && "w-full",
          )}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

/** Slide-in drawer version of the same nav for small screens, opened from the top bar's menu button. */
export function MobileSidebar() {
  const { mobileNavOpen, setMobileNavOpen } = useShell();
  return (
    <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-inverse-surface/50 animate-overlay-in md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[18rem] max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-2xl animate-drawer-in focus:outline-none md:hidden"
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="absolute right-3 top-5 rounded-lg p-1.5 text-sidebar-muted hover:bg-sidebar-hover hover:text-on-primary outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed-dim"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
          <SidebarContent collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();
  const perms = usePermissions();
  const { setSearchOpen } = useShell();
  const groups = useVisibleNav();
  // Comma-separated ids of groups the user has folded away.
  const [foldedRaw, setFoldedRaw] = usePersistedString("eduflow:sidebar-folded-groups", "");
  const folded = useMemo(() => new Set(foldedRaw.split(",").filter(Boolean)), [foldedRaw]);

  if (!user) return null;

  const activeHref = activeNavHref(pathname, groups.flatMap((g) => g.items));

  function toggleGroup(id: string) {
    const next = new Set(folded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFoldedRaw([...next].join(","));
  }

  return (
    <>
      <div className={cn("flex items-center gap-3 px-md pt-md pb-lg", collapsed && "justify-center px-0")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary-container to-secondary text-on-secondary shadow-lg shadow-secondary/30">
          <Icon name="school" className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-title-lg font-bold leading-tight text-on-primary">EduFlow</p>
            <p className="truncate text-label-sm text-sidebar-muted" title={perms?.schoolName ?? undefined}>
              {perms?.schoolName ?? ROLE_LABEL[user.role]}
            </p>
          </div>
        )}
      </div>

      <div className={cn("px-sm pb-sm", collapsed && "flex justify-center")}>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setSearchOpen(true);
          }}
          aria-label="Search"
          title={collapsed ? "Search (Ctrl+K)" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-hover/60 text-label-md text-sidebar-muted transition-colors hover:text-on-primary",
            "outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed-dim",
            collapsed ? "h-10 w-10 justify-center" : "w-full px-3 py-2",
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-sidebar-border px-1.5 py-0.5 font-sans text-[10px]">Ctrl K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-sm pb-md" aria-label="Primary">
        {groups.map((group, index) => {
          const groupActive = group.items.some((i) => i.href === activeHref);
          const open = collapsed || !folded.has(group.id);
          const listId = `nav-group-${group.id}`;
          return (
            <div key={group.id} className={cn(index > 0 && (collapsed ? "mt-2 border-t border-sidebar-border pt-2" : "mt-3"))}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  aria-controls={listId}
                  className="group/heading flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted transition-colors hover:text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed-dim"
                >
                  <span className="flex items-center gap-2">
                    {group.label}
                    {!open && groupActive && (
                      <>
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-secondary-fixed-dim" />
                        <span className="sr-only">(contains current page)</span>
                      </>
                    )}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform motion-reduce:transition-none", !open && "-rotate-90")} />
                </button>
              )}
              {open && (
                <ul id={listId} className={cn("space-y-0.5", !collapsed && "mt-1")}>
                  {group.items.map((item) => {
                    const active = item.href === activeHref;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          title={collapsed ? item.label : undefined}
                          className={cn(
                            "relative flex items-center gap-3 rounded-lg text-body-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed-dim",
                            collapsed ? "mx-auto h-9 w-9 justify-center" : "px-3 py-1.5",
                            active
                              ? "bg-secondary-container/90 font-semibold text-on-secondary-container shadow-sm shadow-secondary/20"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-on-primary",
                          )}
                        >
                          {active && !collapsed && <span aria-hidden className="absolute -left-2 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-secondary-fixed-dim" />}
                          <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                          {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                          {!collapsed && <NavPendingSpinner />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className={cn("border-t border-sidebar-border p-sm", collapsed && "flex justify-center")}>
        <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2", collapsed && "px-0")} title={collapsed ? `${user.name} · ${perms?.roleName ?? ROLE_LABEL[user.role]}` : undefined}>
          <Avatar name={user.name} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-label-md font-semibold text-on-primary">{user.name}</p>
              <p className="truncate text-label-sm text-sidebar-muted">{perms?.roleName ?? ROLE_LABEL[user.role]}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** Shows on the clicked link while its page is still loading — instant feedback even before the route's loading.tsx fallback has been prefetched (slow networks). Must render inside the <Link>. */
function NavPendingSpinner() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 aria-hidden className="loader-delayed ml-auto h-4 w-4 motion-safe:animate-spin" />;
}
