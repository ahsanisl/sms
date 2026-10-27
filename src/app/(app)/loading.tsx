import { TopProgressBar } from "@/components/layout/global-loader";
import { Skeleton } from "@/components/ui/skeleton";

// Shown inside the app shell (sidebar + topbar stay put) whenever a page in
// this route group is loading its data on the server — every page here
// fetches through the services layer, so this covers all of them. Next.js
// prefetches this fallback, so it appears the moment a link is clicked.
// A layout-shaped skeleton (header, KPI row, table) rather than a bare
// spinner, so the page doesn't jump when the real content arrives; faded in
// after a short delay (.loader-delayed) so fast loads never flash it.
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="loader-delayed">
      <span className="sr-only">Loading…</span>
      <TopProgressBar />
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-outline-variant/70 bg-surface-container-lowest p-5 card-shadow">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-7 w-20" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-outline-variant/70 bg-surface-container-lowest card-shadow">
        <div className="border-b border-outline-variant/50 p-4">
          <Skeleton className="h-10 w-full max-w-[28rem]" />
        </div>
        <div className="divide-y divide-outline-variant/30">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-16 md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
