"use client";

import { useCallback, useSyncExternalStore } from "react";

const LOCAL_EVENT = "eduflow:persisted-state";

/** Fallback when localStorage is unavailable (private mode, blocked site data) — the preference then lasts for this page load only. */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Kept in memory only.
  }
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_EVENT, callback);
  };
}

/**
 * A per-browser UI preference (sidebar collapsed, nav groups folded) kept in
 * localStorage. Renders `fallback` on the server and during hydration, so
 * there's no hydration mismatch.
 */
export function usePersistedString(key: string, fallback: string): [string, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key) ?? fallback,
    () => fallback,
  );
  const setValue = useCallback((next: string) => write(key, next), [key]);
  return [value, setValue];
}

export function usePersistedBoolean(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const [raw, setRaw] = usePersistedString(key, fallback ? "1" : "0");
  const setValue = useCallback((next: boolean) => setRaw(next ? "1" : "0"), [setRaw]);
  return [raw === "1", setValue];
}
