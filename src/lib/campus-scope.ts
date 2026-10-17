import type { Role } from "@/lib/types";

/**
 * Cookie holding the top bar switcher's chosen campus id (absent = "All
 * Campuses"). Read server-side only, via services/scope.ts's
 * getViewCampusId — which re-validates it against the session's own campus
 * scope, so a stale or tampered value can only ever narrow a view, never
 * widen it.
 */
export const VIEW_CAMPUS_COOKIE = "eduflow-view-campus";

/** Roles whose data view can be switched between campuses via the top bar. Every other role is locked to its own `campusId` (or unscoped, for roles like teacher/parent that scope by class/children instead). */
const SWITCHABLE_ROLES: Role[] = ["school_owner", "school_admin", "accountant"];

export function canSwitchCampus(role: Role): boolean {
  return SWITCHABLE_ROLES.includes(role);
}
