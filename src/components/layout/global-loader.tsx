"use client";

import { createContext, useContext, useMemo, useTransition, type ReactNode, type TransitionStartFunction } from "react";
import { useRouter } from "next/navigation";

/**
 * One app-wide "something is loading" signal, shown as a thin bar across the
 * top of the window.
 *
 * Why it's needed: when a dropdown pushes new search params (e.g.
 * /attendance/mark?classId=...) or a save calls router.refresh(), Next.js
 * keeps the current screen on display while the server sends fresh data —
 * the route's loading.tsx only appears when moving to a different page. Any
 * router call made through useLoadingRouter() below runs inside this
 * provider's transition, so the bar stays up until the new data has
 * rendered.
 *
 * The run function and the pending flag live in separate contexts so that
 * components which only navigate don't re-render every time loading starts
 * or stops.
 */
const RunContext = createContext<TransitionStartFunction | null>(null);
const PendingContext = createContext(false);

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <RunContext.Provider value={startTransition}>
      <PendingContext.Provider value={isPending}>
        {isPending && <TopProgressBar />}
        {children}
      </PendingContext.Provider>
    </RunContext.Provider>
  );
}

/** Same thin bar as PageLoader's, pinned across the very top of the window. */
export function TopProgressBar() {
  return (
    <div role="progressbar" aria-label="Loading" className="loader-delayed fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-secondary/15">
      <div className="loader-bar h-full w-1/4 rounded-full bg-secondary" />
    </div>
  );
}

/**
 * Runs `work` (sync or async) as a global loading transition — the bar shows
 * until it finishes and any navigation/refresh it started has rendered. For
 * data loads that aren't a plain router call, e.g. a server action followed
 * by a refresh.
 */
export function useGlobalTransition(): TransitionStartFunction {
  const run = useContext(RunContext);
  return run ?? ((work) => void work());
}

/** True while any global loading transition is in flight. */
export function useGlobalLoading(): boolean {
  return useContext(PendingContext);
}

/**
 * Drop-in replacement for next/navigation's useRouter(): same methods, but
 * push/replace/refresh run as a global loading transition, so the top bar
 * shows while the new data loads. Use this instead of useRouter() in client
 * components.
 */
export function useLoadingRouter(): ReturnType<typeof useRouter> {
  const router = useRouter();
  const run = useGlobalTransition();
  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => run(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) => run(() => router.replace(...args)),
      refresh: () => run(() => router.refresh()),
    }),
    [router, run],
  );
}
