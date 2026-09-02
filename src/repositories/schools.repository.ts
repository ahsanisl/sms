import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schools, users, type NewSchool, type School } from "@/db/schema";

export async function listSchools() {
  return db.select().from(schools);
}

export async function getSchool(schoolId: string) {
  const [row] = await db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
  return row ?? null;
}

export async function createSchool(input: NewSchool) {
  const [row] = await db.insert(schools).values(input).returning();
  return row;
}

export async function updateSchool(schoolId: string, input: Partial<School>) {
  const [row] = await db.update(schools).set(input).where(eq(schools.id, schoolId)).returning();
  return row ?? null;
}

export async function archiveSchool(schoolId: string) {
  await db.update(schools).set({ status: "archived" }).where(eq(schools.id, schoolId));
}

/** A school should never exist with nobody able to log into it — created atomically with its first Owner account. */
export async function createSchoolWithOwner(schoolInput: NewSchool, ownerName: string, ownerEmail: string, ownerPasswordHash: string) {
  return db.transaction(async (tx) => {
    const [school] = await tx.insert(schools).values(schoolInput).returning();
    const [owner] = await tx
      .insert(users)
      .values({
        schoolId: school.id,
        role: "school_owner",
        name: ownerName,
        email: ownerEmail.toLowerCase(),
        passwordHash: ownerPasswordHash,
        avatarSeed: ownerName,
      })
      .returning();
    return { school, owner };
  });
}
