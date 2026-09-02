import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inquiries, type NewInquiry } from "@/db/schema";

export async function listInquiries(campusIds: string[]) {
  if (campusIds.length === 0) return [];
  return db.select().from(inquiries).where(inArray(inquiries.campusId, campusIds));
}

export async function getInquiry(campusIds: string[], inquiryId: string) {
  if (campusIds.length === 0) return null;
  const [row] = await db
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.id, inquiryId), inArray(inquiries.campusId, campusIds)))
    .limit(1);
  return row ?? null;
}

export async function createInquiry(campusId: string, input: Omit<NewInquiry, "campusId">) {
  const [row] = await db.insert(inquiries).values({ ...input, campusId }).returning();
  return row;
}

export async function updateInquiryStage(campusIds: string[], inquiryId: string, stage: string, notes?: string) {
  const [row] = await db
    .update(inquiries)
    .set({ stage: stage as never, ...(notes !== undefined ? { notes } : {}), updatedAt: new Date() })
    .where(and(eq(inquiries.id, inquiryId), inArray(inquiries.campusId, campusIds)))
    .returning();
  return row ?? null;
}

export async function markConverted(inquiryId: string, studentId: string) {
  await db.update(inquiries).set({ stage: "admitted", convertedStudentId: studentId, updatedAt: new Date() }).where(eq(inquiries.id, inquiryId));
}
