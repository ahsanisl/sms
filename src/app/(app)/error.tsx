"use client";

// Catches any error a Server Component in this route group throws while
// rendering — most commonly `PermissionError`/`UnauthenticatedError` from
// lib/tenancy.ts, thrown by a service's `requirePermission` when a session
// without the right role reaches a page directly (a typed URL, a stale
// bookmark, or a browser back/forward to a route AuthGuard would otherwise
// have redirected away from before the page ever loaded). Without this,
// Next's default behavior is a bare, unbranded "This page couldn't load"
// screen instead of a normal in-app message.
//
// Next.js redacts a Server Component error's real message before it reaches
// this boundary in production (keeping only a `digest`), so this can't
// reliably distinguish "no permission" from a genuine bug — it shows one
// generic, non-alarming fallback for both rather than guessing.

import Link from "next/link";
import { useEffect } from "react";
import { EmptyState } from "@/components/shared/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4">
        <EmptyState
          icon="lock"
          title="This page isn't available"
          description="You may not have access to it, or something went wrong loading it. Try going back to the dashboard."
          actionLabel="Try Again"
          onAction={reset}
        />
        <Link href="/dashboard" className="text-label-md text-secondary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
