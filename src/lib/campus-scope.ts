"use client";

import { useSession } from "@/lib/auth/session-context";
import type { Role } from "@/lib/types";

/** Roles whose data view can be switched between campuses via the top bar. Every other role is locked to its own `user.campusId` (or unscoped, for roles like teacher/parent that scope by class/children instead). */
const SWITCHABLE_ROLES: Role[] = ["school_owner", "school_admin", "accountant"];

export function canSwitchCampus(role: Role): boolean {
  return SWITCHABLE_ROLES.includes(role);
}

/**
 * The single source of truth for "which campus's data should this page show
 * right now." Centralizes what used to be duplicated (and inconsistently
 * applied — see the product audit) as `user.role === "campus_admin" ?
 * user.campusId : undefined` across a dozen pages.
 *
 * - Campus Admin (and any future single-campus role): always their own campus.
 * - School Owner / School Admin / Accountant: whatever the top bar switcher
 *   is set to (`undefined` = "All Campuses").
 * - Teacher / Parent: undefined — those roles scope by class/children, not campus.
 */
export function useCampusScope(): { scopedCampusId: string | undefined; isAllCampuses: boolean } {
  const { user, viewCampusId } = useSession();
  if (!user) return { scopedCampusId: undefined, isAllCampuses: true };

  if (canSwitchCampus(user.role)) {
    return { scopedCampusId: viewCampusId ?? undefined, isAllCampuses: !viewCampusId };
  }

  if (user.role === "campus_admin") {
    return { scopedCampusId: user.campusId, isAllCampuses: !user.campusId };
  }

  return { scopedCampusId: undefined, isAllCampuses: true };
}
