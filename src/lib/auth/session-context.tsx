"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppUser } from "@/lib/types";

const STORAGE_KEY = "eduflow-session-v1";
const VIEW_CAMPUS_KEY = "eduflow-view-campus-v1";

interface SessionContextValue {
  user: AppUser | null;
  isLoading: boolean;
  login: (user: AppUser) => void;
  logout: () => void;
  /** Campus the top bar switcher is currently scoped to; `null` means "All Campuses". Only meaningful for roles not already locked to one campus (school_owner, school_admin, accountant). */
  viewCampusId: string | null;
  setViewCampusId: (campusId: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewCampusId, setViewCampusIdState] = useState<string | null>(null);

  useEffect(() => {
    // One-time hydration of persisted session on mount — reading localStorage
    // can only happen client-side, so this can't be a lazy useState initializer.
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw));
      const viewCampus = window.localStorage.getItem(VIEW_CAMPUS_KEY);
      if (viewCampus) setViewCampusIdState(viewCampus);
    } catch {
      // ignore malformed storage
    } finally {
      setIsLoading(false);
    }
  }, []);

  function login(nextUser: AppUser) {
    setUser(nextUser);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // ignore quota errors
    }
  }

  function logout() {
    setUser(null);
    setViewCampusIdState(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(VIEW_CAMPUS_KEY);
    } catch {
      // ignore
    }
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
    <SessionContext.Provider value={{ user, isLoading, login, logout, viewCampusId, setViewCampusId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
