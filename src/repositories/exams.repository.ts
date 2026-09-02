import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { examClasses, examSubjects, exams, gradeBands, marksEntries, type NewExam } from "@/db/schema";

async function attachClassesAndSubjects<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, classIds: [] as string[], subjectIds: [] as string[] }));
  const examIds = rows.map((r) => r.id);
  const [classLinks, subjectLinks] = await Promise.all([
    db.select().from(examClasses).where(inArray(examClasses.examId, examIds)),
    db.select().from(examSubjects).where(inArray(examSubjects.examId, examIds)),
  ]);
  const classesByExam = new Map<string, string[]>();
  for (const link of classLinks) classesByExam.set(link.examId, [...(classesByExam.get(link.examId) ?? []), link.classId]);
  const subjectsByExam = new Map<string, string[]>();
  for (const link of subjectLinks) subjectsByExam.set(link.examId, [...(subjectsByExam.get(link.examId) ?? []), link.subjectId]);
  return rows.map((r) => ({ ...r, classIds: classesByExam.get(r.id) ?? [], subjectIds: subjectsByExam.get(r.id) ?? [] }));
}

export async function listExams(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  const rows = await db.select().from(exams).where(inArray(exams.campusId, campusIds));
  return attachClassesAndSubjects(rows);
}

export async function getExam(campusIds: string[], examId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.id, examId), inArray(exams.campusId, campusIds)))
    .limit(1);
  if (!row) return null;
  const [withLinks] = await attachClassesAndSubjects([row]);
  return withLinks;
}

export async function createExam(campusId: string, input: Omit<NewExam, "campusId" | "resultsPublished">, classIds: string[], subjectIds: string[]) {
  return db.transaction(async (tx) => {
    const [exam] = await tx
      .insert(exams)
      .values({ ...input, campusId, resultsPublished: false })
      .returning();
    if (classIds.length > 0) await tx.insert(examClasses).values(classIds.map((classId) => ({ examId: exam.id, classId })));
    if (subjectIds.length > 0) await tx.insert(examSubjects).values(subjectIds.map((subjectId) => ({ examId: exam.id, subjectId })));
    return exam;
  });
}

export async function setResultsPublished(examId: string, published: boolean) {
  await db.update(exams).set({ resultsPublished: published }).where(eq(exams.id, examId));
}

export async function listMarksForExam(examId: string) {
  return db.select().from(marksEntries).where(eq(marksEntries.examId, examId));
}

export async function listMarksForStudent(studentId: string) {
  return db.select().from(marksEntries).where(eq(marksEntries.studentId, studentId));
}

/** Every mark across a set of exams — used by the Reports Center's cross-exam aggregates (Performance Overview, Subject Averages), which need marks scoped by campus, not by one exam or one student. */
export async function listMarksForExams(examIds: string[]) {
  if (examIds.length === 0) return [];
  return db.select().from(marksEntries).where(inArray(marksEntries.examId, examIds));
}

/** One row per (examId, studentId, subjectId) — upserted, since re-entering a mark should replace, not duplicate. */
export async function enterMarksBulk(entries: { examId: string; studentId: string; subjectId: string; obtainedMarks: number; totalMarks: number }[]) {
  for (const entry of entries) {
    const existing = await db
      .select()
      .from(marksEntries)
      .where(and(eq(marksEntries.examId, entry.examId), eq(marksEntries.studentId, entry.studentId), eq(marksEntries.subjectId, entry.subjectId)))
      .limit(1);
    if (existing[0]) {
      await db.update(marksEntries).set({ ...entry, status: "draft" }).where(eq(marksEntries.id, existing[0].id));
    } else {
      await db.insert(marksEntries).values({ ...entry, status: "draft" });
    }
  }
}

export async function setMarksStatusForExam(examId: string, status: "draft" | "submitted" | "published") {
  await db.update(marksEntries).set({ status }).where(eq(marksEntries.examId, examId));
}

export async function listGradeBands(schoolId: string) {
  return db.select().from(gradeBands).where(eq(gradeBands.schoolId, schoolId));
}

export async function setGradeBands(schoolId: string, bands: { grade: string; minPercentage: number }[]) {
  await db.transaction(async (tx) => {
    await tx.delete(gradeBands).where(eq(gradeBands.schoolId, schoolId));
    if (bands.length > 0) await tx.insert(gradeBands).values(bands.map((b) => ({ ...b, schoolId })));
  });
}
