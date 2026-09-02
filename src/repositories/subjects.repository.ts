import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subjects, type NewSubject } from "@/db/schema";

export async function listSubjects(schoolId: string) {
  return db.select().from(subjects).where(eq(subjects.schoolId, schoolId));
}

export async function getSubject(schoolId: string, subjectId: string) {
  const [row] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

export async function createSubject(schoolId: string, input: Omit<NewSubject, "schoolId">) {
  const [row] = await db
    .insert(subjects)
    .values({ ...input, schoolId })
    .returning();
  return row;
}

export async function updateSubject(schoolId: string, subjectId: string, input: Partial<NewSubject>) {
  const [row] = await db
    .update(subjects)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

export async function archiveSubject(schoolId: string, subjectId: string) {
  await db
    .update(subjects)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(subjects.id, subjectId), eq(subjects.schoolId, schoolId)));
}
