"use client";

import { useEffect } from "react";
import { useLoadingRouter } from "@/components/layout/global-loader";
import { useSession } from "@/lib/auth/session-context";

export default function RootPage() {
  const { user, isLoading } = useSession();
  const router = useLoadingRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, user, router]);

  return null;
}
