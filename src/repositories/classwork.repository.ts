import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classwork, type NewClasswork } from "@/db/schema";

export async function listClasswork(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(classwork).where(inArray(classwork.classId, classIds)).orderBy(desc(classwork.date));
}

export async function getClasswork(classIds: string[], classworkId: string) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(classwork)
    .where(and(eq(classwork.id, classworkId), inArray(classwork.classId, classIds)))
    .limit(1);
  return row ?? null;
}

export async function createClasswork(input: NewClasswork) {
  const [row] = await db.insert(classwork).values(input).returning();
  return row;
}

export async function updateClasswork(classIds: string[], classworkId: string, input: Partial<Omit<NewClasswork, "id">>) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .update(classwork)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(classwork.id, classworkId), inArray(classwork.classId, classIds)))
    .returning();
  return row ?? null;
}

export async function deleteClasswork(classIds: string[], classworkId: string) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .delete(classwork)
    .where(and(eq(classwork.id, classworkId), inArray(classwork.classId, classIds)))
    .returning();
  return row ?? null;
}
