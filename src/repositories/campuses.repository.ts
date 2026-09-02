import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { campuses, type NewCampus } from "@/db/schema";

/** Every function here takes schoolId first and folds it into the WHERE clause — the tenant boundary, not an afterthought. */
export async function listCampuses(schoolId: string) {
  return db.select().from(campuses).where(eq(campuses.schoolId, schoolId));
}

export async function getCampus(schoolId: string, campusId: string) {
  const [row] = await db
    .select()
    .from(campuses)
    .where(and(eq(campuses.id, campusId), eq(campuses.schoolId, schoolId)))
    .limit(1);
  return row ?? null; // not found *or* belongs to another school — indistinguishable to the caller, on purpose (no IDOR confirmation)
}

export async function createCampus(schoolId: string, input: Omit<NewCampus, "schoolId">) {
  const [row] = await db
    .insert(campuses)
    .values({ ...input, schoolId })
    .returning();
  return row;
}

export async function updateCampus(schoolId: string, campusId: string, input: Partial<NewCampus>) {
  const [row] = await db
    .update(campuses)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(campuses.id, campusId), eq(campuses.schoolId, schoolId)))
    .returning();
  return row ?? null;
}

export async function archiveCampus(schoolId: string, campusId: string) {
  await db
    .update(campuses)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(campuses.id, campusId), eq(campuses.schoolId, schoolId)));
}
