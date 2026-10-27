"use client";

import { createContext, useContext } from "react";
import type { PermissionModule } from "@/lib/types";

/** Shape returned by GET /api/me/permissions. */
export interface PermissionsResponse {
  permissions: Partial<Record<PermissionModule, boolean>>;
  onboardingComplete: boolean | null;
  schoolName: string | null;
}

/**
 * The real, DB-backed permission matrix for the signed-in user, fetched once
 * by AuthGuard and shared with the shell (sidebar, top bar, command palette)
 * so each doesn't refetch it. Cosmetic only — every page and mutation is
 * still guarded server-side.
 */
const PermissionsContext = createContext<PermissionsResponse | null>(null);

export const PermissionsProvider = PermissionsContext.Provider;

export function usePermissions(): PermissionsResponse | null {
  return useContext(PermissionsContext);
}

/** True unless the matrix explicitly denies `module` (or `module` is null, meaning the route is ungated). */
export function allows(perms: PermissionsResponse | null, module: PermissionModule | null): boolean {
  return !module || perms?.permissions[module] === true;
}
