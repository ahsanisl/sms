"use client";

import { useSession } from "@/lib/auth/session-context";

/**
 * The effective school (tenant) whose data the current session should see.
 * Every role except platform_admin belongs to exactly one school
 * (AppUser.schoolId, set at login). platform_admin has no single school —
 * their console (Dashboard + Settings → Schools) intentionally never needs
 * one school's live operational data, so this always resolves to
 * `undefined` for them; see lib/store/school-scope.ts for what that means
 * for the rest of the store.
 */
export function useSchoolScope(): { effectiveSchoolId: string | undefined } {
  const { user } = useSession();
  if (!user || user.role === "platform_admin") return { effectiveSchoolId: undefined };
  return { effectiveSchoolId: user.schoolId };
}
