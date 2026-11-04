import "server-only";
import bcrypt from "bcryptjs";
import * as schoolRoleRepo from "@/repositories/school-roles.repository";
import * as userRepo from "@/repositories/users.repository";
import * as campusRepo from "@/repositories/campuses.repository";
import * as teacherRepo from "@/repositories/teachers.repository";
import { effectiveRole, requirePermission } from "@/lib/authorization";
import { NotFoundError, PermissionError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { ALWAYS_ON_MODULES, CUSTOM_ROLE_BASES, SCHOOL_ROLE_MODULES } from "@/lib/school-roles";
import { AssignRoleSchema, CreateRoleSchema, CreateUserSchema, UpdateRoleSchema } from "@/lib/validation/role";
import type { PermissionModule, Role } from "@/lib/types";
import { logAudit } from "@/services/audit.service";

/**
 * Settings → Users & Roles: each school's own roles (six defaults plus any
 * custom ones), their module permissions, and which role each account uses.
 *
 * Guardrails, all enforced here rather than trusted to the UI:
 * - Only School Owners and School Admins (holding Users & Roles access) can
 *   manage roles or users — not a custom role that happens to hold it.
 * - The School Owner role can't be edited, and only an Owner can make
 *   someone an Owner or change an Owner's role. The last Owner can't be moved
 *   off the role. Together these mean nobody can lock the Owner out.
 * - Nobody can remove their own role's access to Users & Roles, and every
 *   role keeps Dashboard (it's where everyone lands after login).
 * - Everything is scoped to the caller's own school; a role or user id from
 *   another school is simply "not found".
 */
export async function requireRoleManager(session: AuthSession): Promise<string> {
  await requirePermission(session, "settingsUsers");
  const schoolId = requireSchoolId(session);
  if (session.role === "school_owner") return schoolId;
  // The default School Admin role only — a custom role *based on* School Admin
  // that was given Users & Roles must not be able to raise its own permissions.
  if (session.role === "school_admin") {
    const [current, systemAdmin] = await Promise.all([effectiveRole(session), schoolRoleRepo.getSystemRole(schoolId, "school_admin")]);
    if (current.roleId && current.roleId === systemAdmin?.id) return schoolId;
  }
  throw new PermissionError("settingsUsers");
}

export async function getUsersAndRoles(session: AuthSession) {
  const schoolId = await requireRoleManager(session);
  const [roles, permissionRows, users, current, childCounts] = await Promise.all([
    schoolRoleRepo.listRoles(schoolId),
    schoolRoleRepo.listPermissionsForSchool(schoolId),
    userRepo.listUsersBySchool(schoolId),
    effectiveRole(session),
    userRepo.countChildrenByParent(schoolId),
  ]);
  const childrenOf = new Map(childCounts.map((c) => [c.parentUserId, c.total]));
  const systemRoleId = new Map(roles.filter((r) => r.isSystem).map((r) => [r.baseRole, r.id]));
  const roleIds = new Set(roles.map((r) => r.id));

  const matrix: Record<string, Partial<Record<PermissionModule, boolean>>> = {};
  for (const row of permissionRows) (matrix[row.roleId] ??= {})[row.module as PermissionModule] = row.allowed;

  const userRows = users
    .filter((u) => u.role !== "platform_admin")
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      baseRole: u.role,
      // Same resolution as lib/authorization.ts: a valid assignment, else the school's default role for their built-in role.
      roleId: u.schoolRoleId && roleIds.has(u.schoolRoleId) && roles.find((r) => r.id === u.schoolRoleId)?.baseRole === u.role ? u.schoolRoleId : (systemRoleId.get(u.role) ?? null),
      campusId: u.campusId,
      teacherId: u.teacherId,
      mustChangePassword: u.mustChangePassword,
      childCount: u.role === "parent" ? (childrenOf.get(u.id) ?? 0) : null,
    }));

  return {
    roles: roles.map((r) => ({ ...r, userCount: userRows.filter((u) => u.roleId === r.id).length })),
    matrix,
    users: userRows,
    currentUserId: session.userId,
    currentRoleId: current.roleId,
    isOwner: session.role === "school_owner",
  };
}

async function getRoleOrThrow(schoolId: string, roleId: string) {
  const role = await schoolRoleRepo.getRole(schoolId, roleId);
  if (!role) throw new NotFoundError("Role");
  return role;
}

export async function createRole(session: AuthSession, input: unknown) {
  const schoolId = await requireRoleManager(session);
  const data = CreateRoleSchema.parse(input);
  if (!CUSTOM_ROLE_BASES.some((b) => b.baseRole === data.baseRole)) throw new Error("Choose what this role is based on.");
  if (await schoolRoleRepo.findRoleByName(schoolId, data.name)) throw new Error(`A role called "${data.name}" already exists.`);

  // Start from the chosen role's permissions, or the base role's default role.
  const source = data.copyFromRoleId ? await getRoleOrThrow(schoolId, data.copyFromRoleId) : await schoolRoleRepo.getSystemRole(schoolId, data.baseRole);
  const sourceRows = source ? await schoolRoleRepo.listPermissionsForRole(source.id) : [];
  const sourceAllowed = new Map(sourceRows.map((r) => [r.module, r.allowed]));
  const permissions = SCHOOL_ROLE_MODULES.map((module) => ({
    module,
    // Copying the (unrestricted) Owner role must not hand out more than is grantable.
    allowed: ALWAYS_ON_MODULES.includes(module) || (sourceAllowed.get(module) ?? (source?.baseRole === "school_owner")),
  }));

  const role = await schoolRoleRepo.createRole({ schoolId, name: data.name, description: data.description, baseRole: data.baseRole, isSystem: false }, permissions);
  await logAudit(session, "role.created", "SchoolRole", role.id, { name: role.name, baseRole: role.baseRole });
  return role;
}

export async function updateRole(session: AuthSession, roleId: string, input: unknown) {
  const schoolId = await requireRoleManager(session);
  const data = UpdateRoleSchema.parse(input);
  const role = await getRoleOrThrow(schoolId, roleId);
  if (role.isSystem) throw new Error("Default roles can't be renamed. Create a custom role instead.");
  const clash = await schoolRoleRepo.findRoleByName(schoolId, data.name);
  if (clash && clash.id !== roleId) throw new Error(`A role called "${data.name}" already exists.`);
  const updated = await schoolRoleRepo.updateRole(schoolId, roleId, data);
  await logAudit(session, "role.updated", "SchoolRole", roleId, { name: data.name });
  return updated;
}

export async function deleteRole(session: AuthSession, roleId: string) {
  const schoolId = await requireRoleManager(session);
  const role = await getRoleOrThrow(schoolId, roleId);
  if (role.isSystem) throw new Error("Default roles can't be deleted.");
  const assigned = await schoolRoleRepo.countUsersAssigned(roleId);
  if (assigned > 0) throw new Error(`${assigned} user${assigned === 1 ? " still uses" : "s still use"} this role — move them to another role first.`);
  await schoolRoleRepo.deleteRole(schoolId, roleId);
  await logAudit(session, "role.deleted", "SchoolRole", roleId, { name: role.name });
}

export async function setRolePermission(session: AuthSession, roleId: string, moduleKey: PermissionModule, allowed: boolean) {
  const schoolId = await requireRoleManager(session);
  const role = await getRoleOrThrow(schoolId, roleId);
  if (role.baseRole === "school_owner") throw new Error("The School Owner role always has full access and can't be changed.");
  if (!SCHOOL_ROLE_MODULES.includes(moduleKey)) throw new Error("That permission can't be granted to a school role.");
  if (!allowed && ALWAYS_ON_MODULES.includes(moduleKey)) throw new Error("Every role needs Dashboard access — it's where they land after login.");
  if (!allowed && moduleKey === "settingsUsers" && roleId === (await effectiveRole(session)).roleId) {
    throw new Error("You can't remove your own access to Users & Roles — have another admin change this instead.");
  }
  await schoolRoleRepo.setPermission(roleId, moduleKey, allowed);
  await logAudit(session, "role_permission.updated", "SchoolRole", roleId, { role: role.name, module: moduleKey, allowed });
}

/**
 * Works out the users-table fields for putting an account on `role`, checking
 * everything that role needs: an Owner-only check for the Owner role, a campus
 * for campus-scoped roles, a teacher profile for teacher-based roles.
 */
async function resolveAssignment(session: AuthSession, schoolId: string, roleId: string, campusId: string | null | undefined, teacherId: string | null) {
  const role = await getRoleOrThrow(schoolId, roleId);
  if (role.baseRole === "parent") throw new Error("Parent accounts are created and linked from a student's record, not here.");
  if (role.baseRole === "school_owner" && session.role !== "school_owner") throw new Error("Only a School Owner can make someone an Owner.");

  let resolvedCampusId: string | null = null;
  if (role.baseRole === "campus_admin" || (role.baseRole === "teacher" && campusId)) {
    if (!campusId) throw new Error(`"${role.name}" is limited to one campus — choose which one.`);
    const campuses = await campusRepo.listCampuses(schoolId);
    if (!campuses.some((c) => c.id === campusId)) throw new NotFoundError("Campus");
    resolvedCampusId = campusId;
  }
  if (role.baseRole === "teacher" && !teacherId) throw new Error(`"${role.name}" is a teacher role — it can only be given to an account linked to a teacher profile.`);
  return { role, campusId: resolvedCampusId };
}

export async function assignUserRole(session: AuthSession, userId: string, input: unknown) {
  const schoolId = await requireRoleManager(session);
  const data = AssignRoleSchema.parse(input);
  const user = await userRepo.getUserWithinSchool(schoolId, userId);
  if (!user || user.role === "platform_admin") throw new NotFoundError("User");
  if (user.role === "parent") throw new Error("Parent accounts can only use the Parent role.");
  if (user.role === "school_owner" && session.role !== "school_owner") throw new Error("Only a School Owner can change an Owner's role.");

  const { role, campusId } = await resolveAssignment(session, schoolId, data.roleId, data.campusId, user.teacherId);

  if (user.role === "school_owner" && role.baseRole !== "school_owner") {
    const owners = (await userRepo.listUsersBySchool(schoolId)).filter((u) => u.role === "school_owner");
    if (owners.length <= 1) throw new Error("This is the school's only Owner — make someone else an Owner first.");
  }

  const updated = await userRepo.updateUserRole(schoolId, userId, {
    role: role.baseRole as Role,
    schoolRoleId: role.isSystem ? null : role.id,
    // Teachers keep their own campus unless one was chosen; whole-school roles have none.
    campusId: role.baseRole === "teacher" ? (campusId ?? user.campusId) : campusId,
  });
  await logAudit(session, "user.role_changed", "User", userId, { from: user.role, to: role.name });
  return updated;
}

export async function createUser(session: AuthSession, input: unknown) {
  const schoolId = await requireRoleManager(session);
  const data = CreateUserSchema.parse(input);
  if (await userRepo.findUserByEmail(data.email)) throw new Error("An account with that email already exists.");

  let teacherId: string | null = null;
  if (data.teacherId) {
    const campusIds = (await campusRepo.listCampuses(schoolId)).map((c) => c.id);
    const teacher = await teacherRepo.getTeacher(campusIds, data.teacherId);
    if (!teacher) throw new NotFoundError("Teacher");
    if ((await userRepo.listUsersBySchool(schoolId)).some((u) => u.teacherId === teacher.id)) throw new Error(`${teacher.name} already has a login.`);
    teacherId = teacher.id;
  }
  const { role, campusId } = await resolveAssignment(session, schoolId, data.roleId, data.campusId, teacherId);

  const created = await userRepo.createUser({
    schoolId,
    role: role.baseRole as Role,
    schoolRoleId: role.isSystem ? null : role.id,
    campusId,
    teacherId,
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, 12),
    // An admin chose this password — the user picks their own at first sign-in.
    mustChangePassword: true,
    avatarSeed: data.name,
  });
  await logAudit(session, "user.created", "User", created.id, { email: created.email, role: role.name });
  return { id: created.id };
}

/** Teacher profiles in this school without a login yet — the choices when creating an account on a teacher-based role. */
export async function listTeachersWithoutLogin(session: AuthSession) {
  const schoolId = await requireRoleManager(session);
  const campusIds = (await campusRepo.listCampuses(schoolId)).map((c) => c.id);
  const [teachers, users] = await Promise.all([teacherRepo.listTeachers(campusIds), userRepo.listUsersBySchool(schoolId)]);
  const linked = new Set(users.map((u) => u.teacherId).filter(Boolean));
  return teachers.filter((t) => !linked.has(t.id) && t.status === "active").map((t) => ({ id: t.id, name: t.name, employeeId: t.employeeId, campusId: t.campusId }));
}


/** Non-throwing form of requireRoleManager — for pages deciding whether to show account-management controls. */
export async function isRoleManager(session: AuthSession): Promise<boolean> {
  try {
    await requireRoleManager(session);
    return true;
  } catch {
    return false;
  }
}
