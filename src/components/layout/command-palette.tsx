"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { useShell } from "@/components/layout/shell-context";
import { useVisibleNav } from "@/components/layout/sidebar";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { allows, usePermissions } from "@/lib/auth/permissions-context";
import { QUICK_ACTIONS, type NavItem } from "@/lib/nav-config";
import { moduleForPath } from "@/lib/permissions";
import { globalSearchAction, type SearchResult } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

interface PaletteEntry {
  key: string;
  section: string;
  label: string;
  hint?: string;
  icon: string;
  href: string;
}

const RECORD_ICON: Record<SearchResult["kind"], string> = {
  student: "person",
  teacher: "school",
  class: "class",
  inquiry: "how_to_reg",
};

const RECORD_SECTION: Record<SearchResult["kind"], string> = {
  student: "Students",
  teacher: "Teachers",
  class: "Classes",
  inquiry: "Admissions",
};

function matchesItem(item: NavItem, q: string) {
  return !q || item.label.toLowerCase().includes(q) || item.keywords?.some((k) => k.includes(q));
}

/** True when focus is in a text field, so the "/" shortcut doesn't hijack typing. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/**
 * Global search (Ctrl/⌘+K or "/"): jumps to any page the role can reach, runs
 * a permission-filtered quick action, or finds a student / teacher / class /
 * admission inquiry by name, roll number, admission number, phone, etc.
 */
export function CommandPalette() {
  const { searchOpen, setSearchOpen } = useShell();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      } else if (e.key === "/" && !searchOpen && !isTyping(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, setSearchOpen]);

  return (
    <DialogPrimitive.Root open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-[2px] animate-overlay-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-[40rem] -translate-x-1/2 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl animate-content-in focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Search EduFlow</DialogPrimitive.Title>
          {/* Remounted on every open so the query and highlighted row start fresh. */}
          {searchOpen && <PaletteBody onClose={() => setSearchOpen(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useLoadingRouter();
  const perms = usePermissions();
  const groups = useVisibleNav();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<{ query: string; results: SearchResult[] }>({ query: "", results: [] });
  const [isSearching, startSearch] = useTransition();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  // Debounced record search; results are tagged with the query they answer so a slow, stale response is ignored.
  useEffect(() => {
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      startSearch(async () => {
        const results = await globalSearchAction(q);
        setRecords({ query: q, results });
      });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [q]);

  const entries = useMemo<PaletteEntry[]>(() => {
    const pages = groups.flatMap((g) => g.items.filter((item) => matchesItem(item, q)).map((item) => ({ key: `page:${item.href}`, section: "Pages", label: item.label, hint: g.label, icon: item.icon, href: item.href })));
    const actions = QUICK_ACTIONS.filter((a) => allows(perms, moduleForPath(a.href)) && matchesItem(a, q)).map((a) => ({ key: `action:${a.href}`, section: "Quick Actions", label: a.label, icon: a.icon, href: a.href }));
    const found = q.length >= 2 && records.query === q ? records.results.map((r) => ({ key: `${r.kind}:${r.id}`, section: RECORD_SECTION[r.kind], label: r.title, hint: r.subtitle, icon: RECORD_ICON[r.kind], href: r.href })) : [];
    // With a query, records lead (that's usually what's being looked for); without one, show navigation first.
    return q ? [...found, ...actions, ...pages] : [...actions, ...pages];
  }, [groups, perms, q, records]);

  const safeIndex = Math.min(activeIndex, Math.max(0, entries.length - 1));

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${safeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [safeIndex]);

  function go(entry: PaletteEntry | undefined) {
    if (!entry) return;
    onClose();
    router.push(entry.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((safeIndex + 1) % Math.max(1, entries.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((safeIndex - 1 + entries.length) % Math.max(1, entries.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(entries[safeIndex]);
    }
  }

  const showSpinner = isSearching && q.length >= 2;
  let lastSection = "";

  return (
    <>
      <div className="flex items-center gap-3 border-b border-outline-variant/60 px-4">
        {showSpinner ? <Loader2 className="h-5 w-5 shrink-0 text-secondary motion-safe:animate-spin" aria-hidden /> : <Search className="h-5 w-5 shrink-0 text-on-surface-variant" aria-hidden />}
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search students, teachers, classes, pages…"
          className="h-14 flex-1 bg-transparent text-body-lg text-on-surface placeholder:text-on-surface-variant/70 outline-none"
          role="combobox"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-activedescendant={entries[safeIndex] ? `${listboxId}-${safeIndex}` : undefined}
          aria-autocomplete="list"
        />
        <kbd className="hidden rounded border border-outline-variant px-1.5 py-0.5 text-[10px] text-on-surface-variant sm:block">Esc</kbd>
      </div>

      <div ref={listRef} id={listboxId} role="listbox" aria-label="Search results" className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-body-md font-medium text-on-surface">{showSpinner ? "Searching…" : `No results for “${query.trim()}”`}</p>
            {!showSpinner && <p className="mt-1 text-label-md text-on-surface-variant">Try a name, roll number, admission number or phone number.</p>}
          </div>
        ) : (
          entries.map((entry, index) => {
            const heading = entry.section !== lastSection ? entry.section : null;
            lastSection = entry.section;
            const active = index === safeIndex;
            return (
              <div key={entry.key}>
                {heading && <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant first:pt-1" role="presentation">{heading}</div>}
                <div
                  id={`${listboxId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={active}
                  onMouseMove={() => active || setActiveIndex(index)}
                  onClick={() => go(entry)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5", active ? "bg-secondary-fixed text-on-secondary-fixed" : "text-on-surface")}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant")}>
                    <Icon name={entry.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md font-medium">{entry.label}</span>
                    {entry.hint && <span className="block truncate text-label-md text-on-surface-variant">{entry.hint}</span>}
                  </span>
                  {active && <CornerDownLeft className="h-4 w-4 shrink-0 opacity-60" aria-hidden />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-outline-variant/60 bg-surface-container-low px-4 py-2 text-label-sm text-on-surface-variant">
        <span><kbd className="font-sans">↑↓</kbd> navigate</span>
        <span><kbd className="font-sans">Enter</kbd> open</span>
        <span className="ml-auto hidden sm:inline">Tip: press <kbd className="font-sans">/</kbd> anywhere to search</span>
      </div>
    </>
  );
}
