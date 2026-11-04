import { requireSession, UnauthenticatedError } from "@/lib/tenancy";
import { effectiveRole } from "@/lib/authorization";
import { PERMISSION_MODULE_LABEL } from "@/lib/permissions";
import * as schoolService from "@/services/school.service";
import * as studentService from "@/services/student.service";
import type { PermissionModule } from "@/lib/types";

/**
 * Mobile API (v1): the signed-in user, their school and permissions — the
 * first call the app makes after signing in. Authenticate with
 * `Authorization: Bearer <token>` (from POST /api/auth/sign-in/password).
 * See docs/mobile-api.md.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const role = await effectiveRole(session);
    const modules = Object.keys(PERMISSION_MODULE_LABEL) as PermissionModule[];
    const school = session.schoolId ? await schoolService.getMySchool(session) : null;
    const children = session.role === "parent" ? await studentService.listMyChildren(session) : [];

    return Response.json({
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        roleName: role.name,
        campusId: session.campusId,
        teacherId: session.teacherId,
        mustChangePassword: session.mustChangePassword,
      },
      school: school ? { id: school.id, name: school.name, logoEmoji: school.logoEmoji } : null,
      permissions: Object.fromEntries(modules.map((m) => [m, role.permissions[m] === true])),
      children: children.map((c) => ({ id: c.id, name: c.name, classId: c.classId, campusId: c.campusId })),
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) return Response.json({ error: "Not signed in." }, { status: 401 });
    throw error;
  }
}
