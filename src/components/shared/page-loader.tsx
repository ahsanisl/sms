import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopProgressBar } from "@/components/layout/global-loader";

/**
 * Full-page loading state: the same top progress bar as the global loader
 * (components/layout/global-loader.tsx) plus a centered spinner. Hook-free, so it renders from a
 * Server Component (app/(app)/loading.tsx) and a Client Component
 * (AuthGuard) alike. Fades in after a short delay (.loader-delayed in
 * globals.css) so fast loads never flash it.
 */
export function PageLoader({ label = "Loading…", fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={cn("loader-delayed", fullScreen ? "h-screen bg-background" : "min-h-[60vh]")}>
      <TopProgressBar />
      <div className={cn("flex flex-col items-center justify-center gap-3 text-on-surface-variant", fullScreen ? "h-full" : "min-h-[60vh]")}>
        <Loader2 aria-hidden className="h-8 w-8 text-secondary motion-safe:animate-spin" />
        <p className="text-body-md">{label}</p>
      </div>
    </div>
  );
}
