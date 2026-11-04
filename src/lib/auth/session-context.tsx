"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "@/auth";
import type { AppUser, Role } from "@/lib/types";

/** Better Auth's browser client — same-origin, so the session cookie is sent automatically. */
const authClient = createAuthClient({ plugins: [inferAdditionalFields<Auth>()] });

interface SessionContextValue {
  user: AppUser | null;
  isLoading: boolean;
  /** Real credential check against the database — returns an error message on failure instead of throwing, so the login form can show it inline. */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<string | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Translates Better Auth's session into the AppUser shape every screen already reads — nothing downstream of useSession() needs to know which auth library is underneath. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession();
  const user: AppUser | null = data?.user
    ? {
        id: data.user.id,
        name: data.user.name,
        role: data.user.role as Role,
        email: data.user.email,
        schoolId: data.user.schoolId ?? undefined,
        campusId: data.user.campusId ?? undefined,
        avatarSeed: data.user.avatarSeed ?? data.user.name,
      }
    : null;

  async function login(email: string, password: string, rememberMe = true): Promise<string | null> {
    const response = await fetch("/api/auth/sign-in/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return response.status === 429 || response.status === 401 ? (body?.message ?? "Invalid email or password.") : "Couldn't sign in right now. Please try again.";
    }
    await refetch();
    return null;
  }

  function logout() {
    void authClient.signOut().finally(() => {
      // Full page load (not a client navigation) so no signed-in state survives in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate hard reload on sign-out
      window.location.assign("/login");
    });
  }

  return <SessionContext.Provider value={{ user, isLoading: isPending, login, logout }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
