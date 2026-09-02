"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  SessionProvider as NextAuthSessionProvider,
  useSession as useNextAuthSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from "next-auth/react";
import type { AppUser } from "@/lib/types";

const VIEW_CAMPUS_KEY = "eduflow-view-campus-v1";

interface SessionContextValue {
  user: AppUser | null;
  isLoading: boolean;
  /** Real credential check against the database — returns an error message on failure instead of throwing, so the login form can show it inline. */
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
  /** Campus the top bar switcher is currently scoped to; `null` means "All Campuses". Only meaningful for roles not already locked to one campus (school_owner, school_admin, accountant). */
  viewCampusId: string | null;
  setViewCampusId: (campusId: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Translates next-auth's session shape into the AppUser shape every existing screen already reads — so nothing downstream of useSession() needs to change. */
function SessionBridge({ children }: { children: ReactNode }) {
  const { data, status } = useNextAuthSession();
  const [viewCampusId, setViewCampusIdState] = useState<string | null>(null);

  useEffect(() => {
    // One-time hydration of persisted campus-switcher state on mount — reading
    // localStorage can only happen client-side, so this can't be a lazy
    // useState initializer.
    try {
      const stored = window.localStorage.getItem(VIEW_CAMPUS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setViewCampusIdState(stored);
    } catch {
      // ignore malformed storage
    }
  }, []);

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
    if (result?.error) return "Invalid email or password.";
    return null;
  }

  function logout() {
    setViewCampusIdState(null);
    try {
      window.localStorage.removeItem(VIEW_CAMPUS_KEY);
    } catch {
      // ignore
    }
    void nextAuthSignOut({ redirectTo: "/login" });
  }

  function setViewCampusId(campusId: string | null) {
    setViewCampusIdState(campusId);
    try {
      if (campusId) window.localStorage.setItem(VIEW_CAMPUS_KEY, campusId);
      else window.localStorage.removeItem(VIEW_CAMPUS_KEY);
    } catch {
      // ignore quota errors
    }
  }

  return (
    <SessionContext.Provider value={{ user, isLoading: status === "loading", login, logout, viewCampusId, setViewCampusId }}>
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
