import "server-only";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, parentChildren, type NewUser } from "@/db/schema";

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function findUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function listUsersBySchool(schoolId: string) {
  return db.select().from(users).where(eq(users.schoolId, schoolId));
}

export async function createUser(input: NewUser) {
  const [row] = await db
    .insert(users)
    .values({ ...input, email: input.email.toLowerCase() })
    .returning();
  return row;
}

/** Changes which role an account uses. `role` is the built-in role it behaves as; `campusId` matters for campus-scoped roles. */
export async function updateUserRole(schoolId: string, userId: string, input: { role: NewUser["role"]; schoolRoleId: string | null; campusId: string | null }) {
  const [row] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

export async function listChildrenForParent(parentUserId: string) {
  return db.select({ studentId: parentChildren.studentId }).from(parentChildren).where(eq(parentChildren.parentUserId, parentUserId));
}

export async function linkParentToChild(parentUserId: string, studentId: string) {
  await db.insert(parentChildren).values({ parentUserId, studentId }).onConflictDoNothing();
}

export async function getUserWithinSchool(schoolId: string, userId: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

/** Sets a new password hash. `mustChangePassword` true for an admin-issued temporary password, false when the user chose it themselves. */
export async function setPassword(userId: string, passwordHash: string, mustChangePassword: boolean) {
  await db.update(users).set({ passwordHash, mustChangePassword, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Parent accounts linked to a student. */
export async function listParentsForStudent(studentId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, schoolId: users.schoolId, mustChangePassword: users.mustChangePassword })
    .from(parentChildren)
    .innerJoin(users, eq(users.id, parentChildren.parentUserId))
    .where(eq(parentChildren.studentId, studentId));
}

export async function unlinkParentFromChild(parentUserId: string, studentId: string) {
  await db.delete(parentChildren).where(and(eq(parentChildren.parentUserId, parentUserId), eq(parentChildren.studentId, studentId)));
}

/** Number of children linked to each parent account in a school — for the Users & Roles list. */
export async function countChildrenByParent(schoolId: string) {
  return db
    .select({ parentUserId: parentChildren.parentUserId, total: count() })
    .from(parentChildren)
    .innerJoin(users, eq(users.id, parentChildren.parentUserId))
    .where(eq(users.schoolId, schoolId))
    .groupBy(parentChildren.parentUserId);
}
