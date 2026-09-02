import "server-only";
import * as departmentRepo from "@/repositories/departments.repository";
import { requirePermission } from "@/lib/authorization";
import { NotFoundError, type AuthSession } from "@/lib/tenancy";
import { DepartmentInputSchema } from "@/lib/validation/department";
import { logAudit } from "@/services/audit.service";
import { assertCampusInScope, scopedCampusIds } from "@/services/scope";

// Departments has no dedicated permission module of its own — it falls under
// the generic "settings" module (see lib/permissions.ts's MODULE_ROUTES
// catch-all for any /settings/* path not covered by a more specific module),
// same as Room Management.

export async function listDepartments(session: AuthSession) {
  const campusIds = await scopedCampusIds(session);
  return departmentRepo.listDepartments(campusIds);
}

export async function createDepartment(session: AuthSession, input: unknown) {
  await requirePermission(session, "settings");
  const data = DepartmentInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const created = await departmentRepo.createDepartment(data.campusId, {
    name: data.name,
    headTeacherId: data.headTeacherId ?? null,
    subjectIds: data.subjectIds,
  });
  await logAudit(session, "department.created", "Department", created.id);
  return created;
}

export async function updateDepartment(session: AuthSession, departmentId: string, input: unknown) {
  await requirePermission(session, "settings");
  const data = DepartmentInputSchema.parse(input);
  await assertCampusInScope(session, data.campusId);
  const campusIds = await scopedCampusIds(session);
  const updated = await departmentRepo.updateDepartment(campusIds, departmentId, {
    name: data.name,
    headTeacherId: data.headTeacherId ?? null,
    subjectIds: data.subjectIds,
  });
  if (!updated) throw new NotFoundError("Department");
  await logAudit(session, "department.updated", "Department", departmentId);
  return updated;
}

export async function archiveDepartment(session: AuthSession, departmentId: string) {
  await requirePermission(session, "settings");
  const campusIds = await scopedCampusIds(session);
  const archived = await departmentRepo.archiveDepartment(campusIds, departmentId);
  if (!archived) throw new NotFoundError("Department");
  await logAudit(session, "department.archived", "Department", departmentId);
  return archived;
}
