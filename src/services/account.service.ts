import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import * as userRepo from "@/repositories/users.repository";
import { NotFoundError, requireSchoolId, type AuthSession } from "@/lib/tenancy";
import { ChangePasswordSchema, LinkParentSchema, ParentAccountSchema } from "@/lib/validation/account";
import { logAudit } from "@/services/audit.service";
import { requireRoleManager } from "@/services/permission.service";
import { getStudent } from "@/services/student.service";

const BCRYPT_ROUNDS = 12;
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A 12-character temporary password without look-alike characters (0/O, 1/l/I). */
export function generateTemporaryPassword(): string {
  return Array.from({ length: 12 }, () => TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)]).join("");
}

/** My Account → Change Password. Any signed-in user, their own account only, current password required. Clears the must-change flag. */
export async function changeOwnPassword(session: AuthSession, input: unknown) {
  const data = ChangePasswordSchema.parse(input);
  const user = await userRepo.findUserById(session.userId);
  if (!user) throw new NotFoundError("Account");
  if (!(await bcrypt.compare(data.currentPassword, user.passwordHash))) throw new Error("Your current password is incorrect.");
  await userRepo.setPassword(user.id, await bcrypt.hash(data.newPassword, BCRYPT_ROUNDS), false);
  await logAudit(session, "user.password_changed", "User", user.id);
}

/**
 * Users & Roles → Reset password: issues a new temporary password (returned
 * once, for the admin to pass on) and makes the user choose their own at
 * next sign-in. Same who-can-manage-whom rules as changing roles: only an
 * Owner can reset an Owner, and you change your own password yourself.
 */
export async function resetUserPassword(session: AuthSession, userId: string) {
  const schoolId = await requireRoleManager(session);
  const user = await userRepo.getUserWithinSchool(schoolId, userId);
  if (!user || user.role === "platform_admin") throw new NotFoundError("User");
  if (user.id === session.userId) throw new Error("Change your own password from My Account instead.");
  if (user.role === "school_owner" && session.role !== "school_owner") throw new Error("Only a School Owner can reset an Owner's password.");
  const temporaryPassword = generateTemporaryPassword();
  await userRepo.setPassword(user.id, await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS), true);
  await logAudit(session, "user.password_reset", "User", user.id);
  return { temporaryPassword };
}

// -- Parent accounts (managed from a student's profile) ---------------------------------------------

/** The student must be one this staff member can manage — reuses student.service's own campus-scoped lookup. */
async function requireManagedStudent(session: AuthSession, studentId: string) {
  await requireRoleManager(session);
  return getStudent(session, studentId);
}

export async function listParentAccounts(session: AuthSession, studentId: string) {
  await requireManagedStudent(session, studentId);
  const schoolId = requireSchoolId(session);
  const parents = await userRepo.listParentsForStudent(studentId);
  return parents.filter((p) => p.schoolId === schoolId).map(({ id, name, email, mustChangePassword }) => ({ id, name, email, mustChangePassword }));
}

/** Creates a parent login linked to this student. The password is temporary — they choose their own at first sign-in. */
export async function createParentAccount(session: AuthSession, studentId: string, input: unknown) {
  const student = await requireManagedStudent(session, studentId);
  const schoolId = requireSchoolId(session);
  const data = ParentAccountSchema.parse(input);
  if (await userRepo.findUserByEmail(data.email)) {
    throw new Error("An account with that email already exists — use “Link existing account” to connect it to this student instead.");
  }
  const created = await userRepo.createUser({
    schoolId,
    campusId: student.campusId,
    role: "parent",
    name: data.name,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
    mustChangePassword: true,
    avatarSeed: data.name,
  });
  await userRepo.linkParentToChild(created.id, student.id);
  await logAudit(session, "parent.account_created", "User", created.id, { studentId: student.id });
  return { id: created.id };
}

/** Links an existing parent account (e.g. a sibling's parent) to this student — matched by email, within this school only. */
export async function linkParentAccount(session: AuthSession, studentId: string, input: unknown) {
  const student = await requireManagedStudent(session, studentId);
  const schoolId = requireSchoolId(session);
  const { email } = LinkParentSchema.parse(input);
  const user = await userRepo.findUserByEmail(email);
  if (!user || user.schoolId !== schoolId) throw new Error("No account with that email in your school.");
  if (user.role !== "parent") throw new Error("That email belongs to a staff account. Only parent accounts can be linked to a student.");
  await userRepo.linkParentToChild(user.id, student.id);
  await logAudit(session, "parent.linked", "User", user.id, { studentId: student.id });
  return { id: user.id };
}

/** Removes the link only; the parent account stays (it may have other children, or be re-linked later). */
export async function unlinkParentAccount(session: AuthSession, studentId: string, parentUserId: string) {
  const student = await requireManagedStudent(session, studentId);
  await userRepo.unlinkParentFromChild(parentUserId, student.id);
  await logAudit(session, "parent.unlinked", "User", parentUserId, { studentId: student.id });
}
