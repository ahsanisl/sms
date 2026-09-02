import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords, attendanceCorrections, type NewAttendanceRecord } from "@/db/schema";

export async function listByClassAndDate(classIds: string[], date: string) {
  if (classIds.length === 0) return [];
  return db
    .select()
    .from(attendanceRecords)
    .where(and(inArray(attendanceRecords.classId, classIds), eq(attendanceRecords.date, date)));
}

export async function listByStudent(studentId: string) {
  return db.select().from(attendanceRecords).where(eq(attendanceRecords.studentId, studentId));
}

/** Every attendance record ever marked for a set of classes, no date filter — used by the dashboard/reports' cumulative aggregates. */
export async function listByClasses(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(attendanceRecords).where(inArray(attendanceRecords.classId, classIds));
}

/** One record per (studentId, date) — an upsert, since resaving a day should replace, not duplicate. */
export async function markAttendanceBulk(records: NewAttendanceRecord[]) {
  for (const record of records) {
    await db
      .insert(attendanceRecords)
      .values(record)
      .onConflictDoUpdate({
        target: [attendanceRecords.studentId, attendanceRecords.date],
        set: { status: record.status, markedBy: record.markedBy, classId: record.classId },
      });
  }
}

export async function addCorrection(input: Omit<(typeof attendanceCorrections)["$inferInsert"], "id" | "status" | "requestedAt">) {
  const [row] = await db.insert(attendanceCorrections).values(input).returning();
  return row;
}

export async function listCorrections(classIds: string[]) {
  if (classIds.length === 0) return [];
  return db.select().from(attendanceCorrections).where(inArray(attendanceCorrections.classId, classIds));
}

export async function reviewCorrection(correctionId: string, status: "approved" | "rejected", reviewedBy: string, reviewNote?: string) {
  return db.transaction(async (tx) => {
    const [correction] = await tx
      .update(attendanceCorrections)
      .set({ status, reviewedBy, reviewNote })
      .where(eq(attendanceCorrections.id, correctionId))
      .returning();
    if (correction && status === "approved") {
      await tx
        .update(attendanceRecords)
        .set({ status: correction.requestedStatus })
        .where(and(eq(attendanceRecords.studentId, correction.studentId), eq(attendanceRecords.date, correction.date)));
    }
    return correction ?? null;
  });
}
