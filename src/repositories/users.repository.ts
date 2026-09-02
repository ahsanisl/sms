import "server-only";
import { and, eq } from "drizzle-orm";
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
