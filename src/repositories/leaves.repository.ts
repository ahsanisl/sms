import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { staffLeaveRequests, type NewStaffLeaveRequest } from "@/db/schema";

export async function listByTeacher(teacherId: string) {
  return db.select().from(staffLeaveRequests).where(eq(staffLeaveRequests.teacherId, teacherId)).orderBy(desc(staffLeaveRequests.requestedAt));
}

export async function listByTeachers(teacherIds: string[]) {
  if (teacherIds.length === 0) return [];
  return db
    .select()
    .from(staffLeaveRequests)
    .where(inArray(staffLeaveRequests.teacherId, teacherIds))
    .orderBy(desc(staffLeaveRequests.requestedAt));
}

export async function getLeaveRequest(id: string) {
  const [row] = await db.select().from(staffLeaveRequests).where(eq(staffLeaveRequests.id, id)).limit(1);
  return row ?? null;
}

export async function createLeaveRequest(input: NewStaffLeaveRequest) {
  const [row] = await db.insert(staffLeaveRequests).values(input).returning();
  return row;
}

/** Only ever transitions a request that's still pending — an already-reviewed request can't be re-reviewed. */
export async function reviewLeaveRequest(id: string, status: "approved" | "rejected", reviewedBy: string, reviewNote?: string) {
  const [row] = await db
    .update(staffLeaveRequests)
    .set({ status, reviewedBy, reviewNote })
    .where(and(eq(staffLeaveRequests.id, id), eq(staffLeaveRequests.status, "pending")))
    .returning();
  return row ?? null;
}
