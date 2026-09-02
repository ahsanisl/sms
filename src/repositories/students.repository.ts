import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { students, studentLifecycleEvents, type NewStudent, type StudentLifecycleEvent } from "@/db/schema";

export async function listStudents(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  return db.select().from(students).where(inArray(students.campusId, campusIds));
}

export async function getStudent(campusIds: string[], studentId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), inArray(students.campusId, campusIds)))
    .limit(1);
  return row ?? null;
}

/**
 * Unscoped by campus — a parent has no campusId of their own (their child
 * could be enrolled at any campus in the school), so this is only safe to
 * call after the caller has independently verified access some other way
 * (e.g. confirming the id is one of that parent's own children via
 * parentChildren). Never call this with a client-supplied id you haven't
 * already authorized.
 */
export async function getStudentById(studentId: string) {
  const [row] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  return row ?? null;
}

/** Batch form of getStudentById — same "only call after independent authorization" caveat applies. */
export async function listByIds(studentIds: string[]) {
  if (studentIds.length === 0) return [];
  return db.select().from(students).where(inArray(students.id, studentIds));
}

export async function createStudent(input: NewStudent) {
  const [row] = await db.insert(students).values(input).returning();
  return row;
}

export async function updateStudent(campusIds: string[], studentId: string, input: Partial<NewStudent>) {
  const [row] = await db
    .update(students)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(students.id, studentId), inArray(students.campusId, campusIds)))
    .returning();
  return row ?? null;
}

export async function deleteStudent(campusIds: string[], studentId: string) {
  await db.delete(students).where(and(eq(students.id, studentId), inArray(students.campusId, campusIds)));
}

export async function addLifecycleEvent(event: Omit<StudentLifecycleEvent, "id" | "createdAt">) {
  const [row] = await db.insert(studentLifecycleEvents).values(event).returning();
  return row;
}

/** Year-end bulk promotion — each student either moves to a new class or graduates to Alumni, with one lifecycle event per student, all in one transaction. */
export async function promoteStudentsBulk(
  items: { studentId: string; toClassId: string | null }[],
  date: string,
  recordedBy: string,
) {
  return db.transaction(async (tx) => {
    for (const item of items) {
      const [existing] = await tx.select().from(students).where(eq(students.id, item.studentId)).limit(1);
      if (!existing) continue;
      if (item.toClassId) {
        await tx.update(students).set({ classId: item.toClassId, updatedAt: new Date() }).where(eq(students.id, item.studentId));
      } else {
        await tx.update(students).set({ status: "alumni", updatedAt: new Date() }).where(eq(students.id, item.studentId));
      }
      await tx.insert(studentLifecycleEvents).values({
        studentId: item.studentId,
        type: "promotion",
        date,
        reason: null,
        resultingStatus: item.toClassId ? null : "alumni",
        fromClassId: existing.classId,
        toClassId: item.toClassId,
        fromCampusId: null,
        toCampusId: null,
        leavingCertificateIssued: null,
        recordedBy,
      });
    }
  });
}

export async function listLifecycleEvents(studentId: string) {
  return db.select().from(studentLifecycleEvents).where(eq(studentLifecycleEvents.studentId, studentId));
}
