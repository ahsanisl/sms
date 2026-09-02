import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { departments, departmentSubjects } from "@/db/schema";

export interface DepartmentInput {
  name: string;
  headTeacherId: string | null;
  subjectIds: string[];
}

async function attachSubjects<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, subjectIds: [] as string[] }));
  const links = await db
    .select()
    .from(departmentSubjects)
    .where(
      inArray(
        departmentSubjects.departmentId,
        rows.map((r) => r.id),
      ),
    );
  const byDepartment = new Map<string, string[]>();
  for (const link of links) {
    byDepartment.set(link.departmentId, [...(byDepartment.get(link.departmentId) ?? []), link.subjectId]);
  }
  return rows.map((r) => ({ ...r, subjectIds: byDepartment.get(r.id) ?? [] }));
}

export async function listDepartments(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  const rows = await db.select().from(departments).where(inArray(departments.campusId, campusIds));
  return attachSubjects(rows);
}

export async function getDepartment(campusIds: string[], departmentId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.id, departmentId), inArray(departments.campusId, campusIds)))
    .limit(1);
  if (!row) return null;
  const [withSubjects] = await attachSubjects([row]);
  return withSubjects;
}

export async function createDepartment(campusId: string, input: DepartmentInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .insert(departments)
      .values({ ...rest, campusId })
      .returning();
    if (subjectIds.length > 0) {
      await tx.insert(departmentSubjects).values(subjectIds.map((subjectId) => ({ departmentId: row.id, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function updateDepartment(campusIds: string[], departmentId: string, input: DepartmentInput) {
  return db.transaction(async (tx) => {
    const { subjectIds, ...rest } = input;
    const [row] = await tx
      .update(departments)
      .set(rest)
      .where(and(eq(departments.id, departmentId), inArray(departments.campusId, campusIds)))
      .returning();
    if (!row) return null;
    await tx.delete(departmentSubjects).where(eq(departmentSubjects.departmentId, departmentId));
    if (subjectIds.length > 0) {
      await tx.insert(departmentSubjects).values(subjectIds.map((subjectId) => ({ departmentId, subjectId })));
    }
    return { ...row, subjectIds };
  });
}

export async function archiveDepartment(campusIds: string[], departmentId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .update(departments)
    .set({ status: "archived" })
    .where(and(eq(departments.id, departmentId), inArray(departments.campusId, campusIds)))
    .returning();
  return row ?? null;
}
