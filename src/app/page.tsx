"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/session-context";

export default function RootPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, user, router]);

  return null;
}
