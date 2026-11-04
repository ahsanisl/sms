"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  useSession as useNextAuthSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import type { AppUser } from "@/lib/types";

interface SessionContextValue {
  user: AppUser | null;
  isLoading: boolean;
  /** Real credential check against the database — returns an error message on failure instead of throwing, so the login form can show it inline. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Translates next-auth's session shape into the AppUser shape every existing screen already reads — so nothing downstream of useSession() needs to change. */
function SessionBridge({ children }: { children: ReactNode }) {
  const { data, status } = useNextAuthSession();
  const user: AppUser | null = data?.user
    ? {
        id: data.user.id,
        name: data.user.name,
        role: data.user.role,
        email: data.user.email,
        schoolId: data.user.schoolId ?? undefined,
        campusId: data.user.campusId ?? undefined,
        avatarSeed: data.user.avatarSeed,
      }
    : null;

  async function login(email: string, password: string): Promise<string | null> {
    const result = await nextAuthSignIn("credentials", { email, password, redirect: false });
    // "too_many_attempts": account locked or IP blocked — see src/lib/login-throttle.ts.
    if (result?.code === "too_many_attempts") return "Too many sign-in attempts. Please wait 15 minutes and try again, or ask your school to reset your password.";
    if (result?.error) return "Invalid email or password.";
    return null;
  }

  function logout() {
    void nextAuthSignOut({ redirectTo: "/login" });
  }

  return (
    <SessionContext.Provider value={{ user, isLoading: status === "loading", login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SessionBridge>{children}</SessionBridge>
    </NextAuthSessionProvider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
