import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { teachers, teacherSubjects, type NewTeacher } from "@/db/schema";

export interface TeacherInput extends Omit<NewTeacher, "campusId"> {
  subjectIds: string[];
}

async function attachSubjects<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, subjectIds: [] as string[] }));
  const links = await db
    .select()
    .from(teacherSubjects)
    .where(
      inArray(
        teacherSubjects.teacherId,
        rows.map((r) => r.id),
      ),
    );
  const byTeacher = new Map<string, string[]>();
  for (const link of links) {
    byTeacher.set(link.teacherId, [...(byTeacher.get(link.teacherId) ?? []), link.subjectId]);
  }
  return rows.map((r) => ({ ...r, subjectIds: byTeacher.get(r.id) ?? [] }));
}

export async function listTeachers(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  const rows = await db.select().from(teachers).where(inArray(teachers.campusId, campusIds));
  return attachSubjects(rows);
}

export async function getTeacher(campusIds: string[], teacherId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(teachers)
    .where(and(eq(teachers.id, teacherId), inArray(teachers.campusId, campusIds)))
    .limit(1);
  if (!row) return null;
  const [withSubjects] = await attachSubjects([row]);
  return withSubjects;
}

export async function createTeacher(campusId: string, input: TeacherInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .insert(teachers)
      .values({ ...rest, campusId })
      .returning();
    if (subjectIds.length > 0) {
      await tx.insert(teacherSubjects).values(subjectIds.map((subjectId) => ({ teacherId: row.id, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function updateTeacher(campusIds: string[], teacherId: string, input: TeacherInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .update(teachers)
      .set({ ...rest, updatedAt: new Date() })
      .where(and(eq(teachers.id, teacherId), inArray(teachers.campusId, campusIds)))
      .returning();
    if (!row) return null;
    await tx.delete(teacherSubjects).where(eq(teacherSubjects.teacherId, teacherId));
    if (subjectIds.length > 0) {
      await tx.insert(teacherSubjects).values(subjectIds.map((subjectId) => ({ teacherId, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function deleteTeacher(campusIds: string[], teacherId: string) {
  await db.delete(teachers).where(and(eq(teachers.id, teacherId), inArray(teachers.campusId, campusIds)));
}
