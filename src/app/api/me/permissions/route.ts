import { requireSession, UnauthenticatedError } from "@/lib/tenancy";
import { can } from "@/lib/authorization";
import * as schoolService from "@/services/school.service";
import { PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import type { PermissionModule } from "@/lib/types";

/**
 * The one client-fetchable window into the real, DB-backed permission
 * matrix — `can()`/`requirePermission()` are `server-only` and every real
 * mutation is independently guarded by them regardless of this endpoint, but
 * `AuthGuard` (a client component, for snappy route-level redirects) had no
 * way to read that same real matrix and was falling back to the mock
 * store's `role_permissions`-shaped data instead — harmless today only
 * because both happened to be seeded identically, exactly the gap flagged
 * repeatedly in this session's own notes. Also carries the current owner's
 * real onboarding-complete flag, and every non-platform-admin role's own
 * school name, for the same reason — both were still being read from the
 * mock store by AuthGuard and Sidebar respectively.
 */
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ permissions: {}, onboardingComplete: null, schoolName: null }, { status: 401 });
    throw error;
  }

  const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
  const entries = await Promise.all(modules.map(async (moduleKey) => [moduleKey, await can(session.role, moduleKey)] as const));
  const permissions = Object.fromEntries(entries) as Record<PermissionModule, boolean>;

  let onboardingComplete: boolean | null = null;
  let schoolName: string | null = null;
  if (session.role !== "platform_admin") {
    const school = await schoolService.getMySchool(session);
    schoolName = school.name;
    if (session.role === "school_owner") onboardingComplete = school.onboardingComplete;
  }

  return Response.json({ permissions, onboardingComplete, schoolName });
}
