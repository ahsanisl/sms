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
import { RotateCcw } from "lucide-react";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div role="alert" className="w-full max-w-[30rem] rounded-2xl border border-outline-variant/70 bg-surface-container-lowest p-xl text-center card-shadow">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-container/70 text-error">
          <Icon name="lock" className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-title-lg font-semibold text-primary">This page isn&apos;t available</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          You may not have access to it, or something went wrong while loading it. Try again, or head back to your dashboard.
        </p>
        <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button onClick={reset}>
            <RotateCcw /> Try Again
          </Button>
        </div>
        {error.digest && <p className="mt-4 text-label-sm text-on-surface-variant">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
