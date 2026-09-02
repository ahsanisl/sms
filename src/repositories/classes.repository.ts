import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classes, classSubjects, type NewClassSection } from "@/db/schema";

export interface ClassInput extends Omit<NewClassSection, "campusId"> {
  subjectIds: string[];
}

async function attachSubjects<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, subjectIds: [] as string[] }));
  const links = await db
    .select()
    .from(classSubjects)
    .where(
      inArray(
        classSubjects.classId,
        rows.map((r) => r.id),
      ),
    );
  const byClass = new Map<string, string[]>();
  for (const link of links) {
    byClass.set(link.classId, [...(byClass.get(link.classId) ?? []), link.subjectId]);
  }
  return rows.map((r) => ({ ...r, subjectIds: byClass.get(r.id) ?? [] }));
}

/** campusIds is the caller's already-tenant-validated set (their school's campuses, or their one campus if Campus Admin) — see services/class.service.ts. */
export async function listClasses(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  const rows = await db.select().from(classes).where(inArray(classes.campusId, campusIds));
  return attachSubjects(rows);
}

export async function getClass(campusIds: string[], classId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), inArray(classes.campusId, campusIds)))
    .limit(1);
  if (!row) return null;
  const [withSubjects] = await attachSubjects([row]);
  return withSubjects;
}

export async function createClass(campusId: string, input: ClassInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .insert(classes)
      .values({ ...rest, campusId })
      .returning();
    if (subjectIds.length > 0) {
      await tx.insert(classSubjects).values(subjectIds.map((subjectId) => ({ classId: row.id, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function updateClass(campusIds: string[], classId: string, input: ClassInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .update(classes)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(classes.id, classId), inArray(classes.campusId, campusIds)))
      .returning();
    if (!row) return null;
    await tx.delete(classSubjects).where(eq(classSubjects.classId, classId));
    if (subjectIds.length > 0) {
      await tx.insert(classSubjects).values(subjectIds.map((subjectId) => ({ classId, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function archiveClass(campusIds: string[], classId: string) {
  await db
    .update(classes)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(classes.id, classId), inArray(classes.campusId, campusIds)));
}
