import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attachments, type NewAttachment } from "@/db/schema";

export async function listAttachments(module: string, entityId: string) {
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.module, module), eq(attachments.entityId, entityId)));
}

/** Attachments for many records of one module at once (e.g. every receipt on the Expenses list). */
export async function listAttachmentsForEntities(module: string, entityIds: string[]) {
  if (entityIds.length === 0) return [];
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.module, module), inArray(attachments.entityId, entityIds)));
}

export async function getAttachment(attachmentId: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, attachmentId)).limit(1);
  return row ?? null;
}

export async function createAttachment(input: NewAttachment) {
  const [row] = await db.insert(attachments).values(input).returning();
  return row;
}

export async function deleteAttachment(attachmentId: string) {
  const [row] = await db.delete(attachments).where(eq(attachments.id, attachmentId)).returning();
  return row ?? null;
}
