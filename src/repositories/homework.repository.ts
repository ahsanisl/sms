import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { homework, homeworkSubmissions, type NewHomework, type NewHomeworkSubmission } from "@/db/schema";

export async function listHomeworkForClasses(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(homework).where(inArray(homework.classId, classIds)).orderBy(desc(homework.dueDate));
}

export async function getHomework(classIds: string[], homeworkId: string) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(homework)
    .where(and(eq(homework.id, homeworkId), inArray(homework.classId, classIds)))
    .limit(1);
  return row ?? null;
}

/** Unscoped single read — only safe to call after an independent authorization check (mirrors students.repository.getStudentById's same documented convention). */
export async function getHomeworkById(homeworkId: string) {
  const [row] = await db.select().from(homework).where(eq(homework.id, homeworkId)).limit(1);
  return row ?? null;
}

export async function createHomework(input: NewHomework) {
  const [row] = await db.insert(homework).values(input).returning();
  return row;
}

export async function updateHomework(classIds: string[], homeworkId: string, input: Partial<Omit<NewHomework, "id">>) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .update(homework)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(homework.id, homeworkId), inArray(homework.classId, classIds)))
    .returning();
  return row ?? null;
}

export async function deleteHomework(classIds: string[], homeworkId: string) {
  if (classIds.length === 0) return null;
  const [row] = await db
    .delete(homework)
    .where(and(eq(homework.id, homeworkId), inArray(homework.classId, classIds)))
    .returning();
  return row ?? null;
}

export async function listSubmissions(homeworkId: string) {
  return db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.homeworkId, homeworkId));
}

export async function getSubmission(homeworkId: string, studentId: string) {
  const [row] = await db
    .select()
    .from(homeworkSubmissions)
    .where(and(eq(homeworkSubmissions.homeworkId, homeworkId), eq(homeworkSubmissions.studentId, studentId)))
    .limit(1);
  return row ?? null;
}

export async function getSubmissionById(submissionId: string) {
  const [row] = await db.select().from(homeworkSubmissions).where(eq(homeworkSubmissions.id, submissionId)).limit(1);
  return row ?? null;
}

/** Upsert on (homeworkId, studentId) — a resubmission replaces the same row rather than creating a duplicate. */
export async function upsertSubmission(input: NewHomeworkSubmission) {
  const [row] = await db
    .insert(homeworkSubmissions)
    .values(input)
    .onConflictDoUpdate({
      target: [homeworkSubmissions.homeworkId, homeworkSubmissions.studentId],
      set: {
        status: input.status,
        submissionText: input.submissionText,
        submittedAt: input.submittedAt,
        // A resubmission after grading clears the previous grade — the teacher reviews the new submission fresh.
        grade: null,
        teacherComment: null,
        gradedAt: null,
        gradedBy: null,
      },
    })
    .returning();
  return row;
}

export async function gradeSubmission(submissionId: string, input: { grade: string; teacherComment: string; gradedBy: string }) {
  const [row] = await db
    .update(homeworkSubmissions)
    .set({ status: "graded", grade: input.grade, teacherComment: input.teacherComment, gradedAt: new Date(), gradedBy: input.gradedBy })
    .where(eq(homeworkSubmissions.id, submissionId))
    .returning();
  return row ?? null;
}
